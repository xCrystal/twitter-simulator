import Twitter from 'twitter'
import Giphy from 'giphy-api'
import fetch from 'node-fetch'
import fetchBase64 from 'fetch-base64'
import S from 'underscore.string'

import config from './config'
import H from './helpers'
import twitterwords from './twitter-words'
import stopwords from './stopwords'
import C from './constants'

const T = new Twitter(config.twitter);
const G = Giphy(config.giphy.key);

const search = async (word, since, until, type = "popular", count = 100) => {
  return await T.get("search/tweets", {
    "q": word + " AND -filter:retweets",
    "lang": "en",
    "since": since,
    "until": until,
    "result_type": type,
    "tweet_mode": "extended",
    "count": count
  });
};

const sampleFormatTweet = (tweets) => {
  let tweet = H.popRandom(tweets.statuses);
  let text = "";
  if (tweet) {
    text = H.clean(tweet.full_text);
    text = H.deleteLink(text);
    text = H.demention(text);
    tweet = { "text": text, "id": tweet.id_str };
  }
  return tweet;
};

const getTweetThird = async (
  word,
  whichThird,
  // Prevent the same tweet from being picked
  discardIds = [],
  maxLen = C.MAX_STRLEN,
  maxForcedLen = C.MAX_FORCED_STRLEN,
  // Tweets with mentions or hashtags tend to lead to unfunnier results,
  // so slightly discourage them.
  maxSpecialDiscards = 2
) => {
  let time = H.randomTimeInterval();
  let tweets = await search(word, time.since, time.until, "popular", 100);
  let output = "";
  let text = "";
  let id = "";

  do {
    do {
      output = sampleFormatTweet(tweets);
      text = output.text;
      id = output.id;
    } while (
      discardIds.indexOf(id) > -1 ||
      maxSpecialDiscards -- > 0 &&
      (text.indexOf("@") > -1 || text.indexOf("#") > -1)
    );
    if (!text) return false;
    switch (whichThird) {
      case "first":
        output = H.strUntil(text, word, maxLen);
        break;
      case "second":
        let minLen = H.randomDiscrete(maxLen, 1);
        output = H.strBetween(text, word, minLen, maxForcedLen);
        break;
      case "third":
        output = H.strFrom(text, word, maxLen);
        break;
      default:
        output = "";
    }
  } while (!output);

  output.id = id;
  console.log("(*", whichThird, "*)", output.text);
  return output;
};

const generateTweet = async () => {
  let tweet = "";
  let word = "";
  let word2 = "";
  let firstOut = "";
  let secondOut = "";
  let thirdOut = "";
  let i = 0;
  do {
    i = H.randomDiscrete((twitterwords.length * 2), 0, -5);
  } while (i > twitterwords.length - 1);
  word = twitterwords[i];

  firstOut = await getTweetThird(word, "first");
  if (!firstOut) return false;
  tweet += firstOut.text;

  secondOut = await getTweetThird(word, "second", firstOut.id);
  if (!secondOut) return false;
  tweet += secondOut.text;
  word2 = secondOut.word;

  thirdOut = await getTweetThird(word2, "third", [firstOut.id, secondOut.id]);
  if (!thirdOut) return false;
  tweet += thirdOut.text;
  tweet = S.unescapeHTML(tweet);
  return (tweet.length < C.MAX_CHARS ? tweet : false);
};

const uploadMediaToTwitter = async (base64, mimeType) => {
  let media = new Buffer(base64[0], "base64");
  let mediaId = (await T.post("media/upload", {
    "command": "INIT",
    "total_bytes": media.length,
    "media_type": mimeType,
  })).media_id_string;

  await T.post("media/upload", {
    "command": "APPEND",
    "media_id": mediaId,
    "media": media,
    "segment_index": 0,
  });

  await T.post("media/upload", {
    "command": "FINALIZE",
    "media_id": mediaId,
  });
  return mediaId;
};

const createMediaKeywords = (text) => {
  text = text.replace(/[^A-Za-z ]/g, "");
  let array = text.toLowerCase().split("\n").join(" ").split(" ");
  let keywords = "";
  for (let i = 0; i < 3; i ++) {
    let keyword = H.popRandom(array);
    if (keyword === false) break;
    if (keyword && stopwords.indexOf(keyword) === -1) {
      keywords += keyword + " ";
    } else {
      i --;
    }
  }
  console.log("(*** Keywords ***)", keywords);
  return keywords;
}

const generateGif = async (tweet) => {
  let keywords = createMediaKeywords(tweet);
  let gif = await G.search({ "q": keywords, "rating": "pg-13" });
  let data = gif.data;
  if (data.length && data[0].hasOwnProperty("images")) {
    let i = H.randomDiscrete(data.length, 0, -2);
    let url = data[i].images.fixed_height.url;
    let base64 = await fetchBase64.remote(url);
    console.log("(*** MEDIA ***)", url);
    return await uploadMediaToTwitter(base64, "image/gif");
  }
  return false;
};

const generateImgur = async (tweet) => {
  const IMGUR_URL = "https://api.imgur.com/3/gallery/t/";
  const HEADER = { "Authorization": "Client-ID " + config.imgur.id }
  const req = async (keyword) => {
    return await fetch(IMGUR_URL + keyword, {
      headers: HEADER
    });
  };
  let keywords = createMediaKeywords(tweet).split(" ");
  if (keywords.length < 3) return false;
  let results = await Promise.all([
    req(keywords[0]),
    req(keywords[1]),
    req(keywords[2])
  ]);
  let res1 = await results[0].json();
  let res2 = await results[1].json();
  let res3 = await results[2].json();
  let res1l = res1.data.total_items;
  let res2l = res2.data.total_items;
  let res3l = res3.data.total_items;
  if (!res1l && !res2l && !res3l) return false;
  let result = {};
  let getImage = (res) => {
    let result = false;
    if (res.data.hasOwnProperty("items") && res.data.items.length) {
      let items = res.data.items;
      let i = H.randomDiscrete(items.length);
      if (!items[i] || items[i].nsfw) {
        return false;
      }
      if (items[i].is_album && items[i].hasOwnProperty("images")) {
        result = items[i].images[0];
      } else if (items[i].hasOwnProperty("link")) {
        result = items[i];
      }
    }
    return result; //TODO filter by enough views/likes
  };
  if (res1l > res2l && res1l > res3l) {
    result = getImage(res1);
  } else if (res2l > res3l) {
    result = getImage(res2);
  } else {
    result = getImage(res3);
  }
  if (!result) return false;
  let base64 = await fetchBase64.remote(result.link);
  return await uploadMediaToTwitter(base64, result.type);
};

(async () => {
  let tweet = false;
  let mediaId = false;
  do {
    try {
      tweet = await generateTweet();
      if (tweet) mediaId = await generateImgur(tweet);
      if (tweet && mediaId) {
        await T.post("statuses/update", {
          "status": tweet,
          "media_ids": mediaId,
        });
        console.log("(*** TWEET ***)", tweet);
      };
    } catch (err) {
      console.error("ERROR: ", err);
    }
  } while (!tweet || !mediaId);
}) ();
