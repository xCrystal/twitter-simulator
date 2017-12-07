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

const uploadGifToTwitter = async (base64) => {
  let gif = new Buffer(base64[0], "base64");
  let gifId = (await T.post("media/upload", {
    "command": "INIT",
    "total_bytes": gif.length,
    "media_type": "image/gif",
  })).media_id_string;

  await T.post("media/upload", {
    "command": "APPEND",
    "media_id": gifId,
    "media": gif,
    "segment_index": 0,
  });

  await T.post("media/upload", {
    "command": "FINALIZE",
    "media_id": gifId,
  });
  return gifId;
};

const createGifKeywords = (text) => {
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
  let keywords = createGifKeywords(tweet);
  let gif = await G.search({ "q": keywords, "rating": "pg-13" });
  let data = gif.data;
  if (data.length && data[0].hasOwnProperty("images")) {
    let i = H.randomDiscrete(data.length, 0, -2);
    let url = data[i].images.fixed_height.url;
    let base64 = await fetchBase64.remote(url);
    console.log("(*** MEDIA ***)", url);
    return await uploadGifToTwitter(base64);
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
  let keywords = createGifKeywords(tweet).split(" ");
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
    let items = res.data.items;
    let i = H.randomDiscrete(items.length);
    return !items[i].nsfw && items[i].images[0];
  }
  if (res1l > res2l && res1l > res3l) {
    result = getImage(res1);
  } else if (res2l > res3l) {
    result = getImage(res2);
  } else {
    result = getImage(res3);
  }
  let base64 = await fetchBase64.remote(result.link);
  return await uploadGifToTwitter(base64);
};

(async () => {
  let tweet = false;
  let gifId = false;
  do {
    try {
      tweet = await generateTweet();
      if (tweet) gifId = await generateImgur(tweet);
      if (tweet && gifId) {
        await T.post("statuses/update", {
          "status": tweet,
          "media_ids": gifId,
        });
        console.log("(*** TWEET ***)", tweet);
      };
    } catch (err) {
      console.error("ERROR: ", err);
    }
  } while (!tweet || !gifId);
}) ();
