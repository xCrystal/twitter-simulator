require("babel-polyfill");
import { Server } from 'http'
import Express from 'express'
import Twitter from 'twitter'
import Giphy from 'giphy-api'
import fetch from 'node-fetch'
import fetchBase64 from 'fetch-base64'
import S from 'underscore.string'

import H from './helpers'
import twitterwords from './twitter-words'
import stopwords from './stopwords'
import C from './constants'

const PORT = process.env.PORT || 8080;
const app = new Express();
const server = new Server(app);
server.listen(PORT);
app.get('*', (req, res) => {
  res.sendStatus(200);
});

let CONFIG = {};
try {
  CONFIG = require("./config").CONFIG;
} catch (e) {
  CONFIG = {
    "twitter": {
      "consumer_key": process.env.TWITTER_CONSUMER_KEY,
      "consumer_secret": process.env.TWITTER_CONSUMER_SECRET,
      "access_token_key": process.env.TWITTER_ACCESS_TOKEN_KEY,
      "access_token_secret": process.env.TWITTER_ACCESS_TOKEN_SECRET,
    },
    "giphy": {
      "key": process.env.GIPHY_KEY,
    },
    "imgur": {
      "id": process.env.IMGUR_ID,
    },
  }
}
const T = new Twitter(CONFIG.twitter);
const G = Giphy(CONFIG.giphy.id);
const IMGUR_ID = CONFIG.imgur.id;

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
  let text1 = firstOut.text;
  tweet += text1;

  secondOut = await getTweetThird(word, "second", firstOut.id);
  if (!secondOut) return false;
  let text2 = secondOut.text;
  tweet += text2;
  word2 = secondOut.word;

  thirdOut = await getTweetThird(word2, "third", [firstOut.id, secondOut.id]);
  if (!thirdOut) return false;
  let text3 = thirdOut.text;
  tweet += text3;

  // Prevent tweets made almost exclusively of a single tweet
  let longest = Math.max(
    text1.split(" ").length, text2.split(" ").length, text3.split(" ").length
  );
  if ((tweet.split(" ").length + 2) / 2 < longest) return false;

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
  const HEADER = { "Authorization": "Client-ID " + IMGUR_ID }
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
      let currentScore = 0, targetScore = 1000;
      let item = {};
      do {
      // This serves a double purpose: favor popular media, and discard
      // results with low overall interaction volume.
        item = H.popRandom(items);
        if (!item) return false;
        if (item.nsfw) continue;
        let tf =
          Math.cbrt((new Date().getTime() - item.datetime * 1000) / 60000);
        let sf = item.ups + item.views / 20;
        currentScore += Math.max(Math.floor(sf - tf), 0);
      } while (currentScore <= targetScore);
      if (item.is_album && item.hasOwnProperty("images")) {
        result = item.images[0];
      } else if (item.hasOwnProperty("link")) {
        result = item;
      }
    }
    return result;
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
  console.log("(*** MEDIA ***)", result.link);
  return await uploadMediaToTwitter(base64, result.type);
};

const postTweet = async () => {
  let tweet = false;
  let mediaId = false;
  let rand = H.random(1);
  do {
    try {
      tweet = await generateTweet();
      if (!tweet) continue;
      if (tweet.substr(tweet.length - 1) === ":") rand /= 2.5;
      if (rand < 0.15) {
        mediaId = await generateGif(tweet);
      } else if (rand < 0.4) {
        mediaId = await generateImgur(tweet);
      }
      if (tweet && !mediaId) {
        await T.post("statuses/update", {
          "status": tweet,
        });
      } else if (tweet && mediaId) {
        await T.post("statuses/update", {
          "status": tweet,
          "media_ids": mediaId,
        });
      };
      console.log("(*** TWEET ***)", tweet);
    } catch (err) {
      console.error("ERROR: ", err);
    }
  } while (!tweet);
};

const testTweet = async () => {
  let tweet = false;
  let mediaId = false;
  let rand = H.random(1);
  do {
    try {
      tweet = await generateTweet();
      if (!tweet) continue;
      if (tweet.substr(tweet.length - 1) === ":") rand /= 2.5;
      if (rand < 0.15) {
        mediaId = await generateGif(tweet);
      } else if (rand < 0.4) {
        mediaId = await generateImgur(tweet);
      }
      console.log("(*** TWEET ***)", tweet);
    } catch (err) {
      console.error("ERROR: ", err);
    }
  } while (!tweet);
};

(async () => {
  if (PORT === 8080) {
    testTweet();
  } else {
    setInterval(postTweet, C.TIME_BETWEEN_TWEETS);
  }
}) ();
