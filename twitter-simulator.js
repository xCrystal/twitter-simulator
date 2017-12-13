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

const search = async (word, type, since = 0, until = 0) => {
  if (!since || !until) {
    return await T.get("search/tweets", {
      "q": word + " AND -filter:retweets",
      "lang": "en",
      "result_type": type,
      "tweet_mode": "extended",
      "count": 100
    });
  } else {
    return await T.get("search/tweets", {
      "q": word + " AND -filter:retweets",
      "lang": "en",
      "since": since,
      "until": until,
      "result_type": type,
      "tweet_mode": "extended",
      "count": 100
    });
  }
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
  // [numberOfThird, retriesLeft]
  searchMode,
  // Prevent the same tweet from being picked
  discardIds = [],
  maxLen = C.MAX_TWEET_THIRD_LEN,
  maxForcedLen = C.MAX_TWEET_THIRD_FORCED_LEN,
) => {

  const getMode = () => {
    let time = H.randomTimeInterval();
    let rand = H.random(1) > 0.5;
    // Compute the search mode (result type and time interval) depending on
    // which third, and on the number of times a search has already been tried
    switch (searchMode) {
      // [numberOfThird, retriesLeft]
      case [1, 0]:
      case [1, 1]:
      default:
        return {
          "type": "popular",
          "since": (rand ? 0 : time.since),
          "until": (rand ? 0 : time.until)
        };
      case [2, 0]:
      case [3, 0]:
        return { "type": "popular", "since": 0, "until": 0 }
      case [2, 1]:
      case [2, 2]:
      case [2, 3]:
      case [3, 1]:
      case [3, 2]:
      case [3, 3]:
        return { "type": "popular", "since": time.since, "until": time.until }
      case [2, 4]:
      case [2, 5]:
      case [3, 4]:
      case [3, 5]:
        return { "type": "recent", "since": 0, "until": 0 }
    }
  };

  let mode = getMode();
  let tweets = await search(word, mode.type, mode.since, mode.until);
  let output = "";
  let text = "";
  let id = "";
  // Tweets with mentions or hashtags tend to lead to unfunnier results,
  // so slightly discourage them.
  let specialDiscardsLeft = C.SPECIAL_CHAR_DISCARDS_ALLOWED;

  do {
    do {
      output = sampleFormatTweet(tweets);
      if (!output || !output.hasOwnProperty("text")) return false;
      text = output.text;
      id = output.id;
    } while (
      discardIds.includes(id) || // Ignore repeated tweet for special discard
      (text.includes("@") || text.includes("#")) &&
      specialDiscardsLeft -- > 0
    );
    if (!text) return false;
    switch (searchMode[0]) {
      case 1:
        output = H.strUntil(text, word, maxLen);
        break;
      case 2:
        let minLen = H.randomDiscrete(maxLen, 1);
        output = H.strBetween(text, word, minLen, maxForcedLen);
        break;
      case 3:
        output = H.strFrom(text, word, maxLen);
        break;
      default:
        output = "";
    }
  } while (!output);

  output.id = id;
  console.log("(*", searchMode[0], " - ", id, "*)", output.text);
  return output.text === " " ? false : output;
};

const generateTweet = async () => {
  let tweet = "";
  let text1 = "", text2 = "", text3 = "";
  let word = "", _word = "", word_ = "";
  let word2 = "", _word2 = "", word2_ = "";
  let nextWord = "", nextWord2 = "";
  let firstOut = "";
  let secondOut = "";
  let thirdOut = "";
  let i = 0;
  do {
    i = H.randomDiscrete((twitterwords.length * 2), 0, -5);
  } while (i > twitterwords.length - 1);
  word = twitterwords[i];

  let retriesLeft = C.THIRD_1_RETRIES_ALLOWED;
  do {
    _word = "";
    word_ = "";
    firstOut = await getTweetThird(word, [1, retriesLeft]);
    if (!firstOut) continue;
    text1 = firstOut.text;
    nextWord = firstOut.nextWord;
    // Check if we can have a pair of common words to hook the next part.
    _word = H.hasWordInArray(text1, 2, twitterwords);
    word_ = H.hasWordInArray(nextWord, 1, twitterwords);
    if (_word === "i") _word = "I";
    if (word_ === "i") word_ = "I";
    // If we don't have any result retry up to one time.
  } while (retriesLeft -- > 0 && !firstOut);
  if (!firstOut) return false;
  tweet += text1;
  // If both neighbout words could work, choose the most common one.
  if (_word.index && _word.index > word_.index) {
    word = _word.word + " " + word;
  } else if (word_.index) {
    word = word + " " + word_.word;
    tweet += (word_.word + " ");
  }

  retriesLeft = C.THIRD_2_RETRIES_ALLOWED;
  do {
    _word2 = "";
    word2_ = "";
    await console.log(word)
    secondOut = await getTweetThird(word, [2, retriesLeft], firstOut.id);
    if (!secondOut) continue;
    text2 = secondOut.text;
    word2 = secondOut.word;
    nextWord2 = secondOut.nextWord;
    // Check if we can have a pair of common words to hook the next part.
    _word2 = H.hasWordInArray(text2, 2, twitterwords);
    word2_ = H.hasWordInArray(nextWord2, 1, twitterwords);
    if (_word2 === "i") _word2 = "I";
    if (word2_ === "i") word2_ = "I";
    // If we don't have any result retry up to three times.
  } while (retriesLeft -- > 0 && !secondOut);
  if (!secondOut) return false;
  tweet += text2;
  // If both neighbout words could work, choose the most common one.
  if (_word2.index && _word2.index > word_.index) {
    word2 = _word2.word + " " + word2;
  } else if (word2_.index) {
    word2 = word2 + " " + word2_.index;
    tweet += (word2_.index +  " ");
  }

  retriesLeft = C.THIRD_3_RETRIES_ALLOWED;
  do {
    thirdOut = await getTweetThird(
      word2,
      [3, retriesLeft],
      [firstOut.id, secondOut.id]
    );
    // Ending with a question tends to look awkward unless it is a
    // sentence on its own.
    if (
      thirdOut &&
      thirdOut.text.includes("?") && !thirdOut.text.includes(".")
    ) {
      thirdOut = null;
    }
    // If we don't have any result retry up to three times.
  } while (retriesLeft -- > 0 && !thirdOut);
  if (!thirdOut) return false;
  text3 = thirdOut.text;
  tweet += text3;

  // Prevent tweets made almost exclusively of a single tweet
  let numWords1 = H.numWords(text1);
  let numWords2 = H.numWords(text2);
  let numWords3 = H.numWords(text3);
  let len1 = text1.length;
  let len2 = text2.length;
  let len3 = text3.length;
  // Not totally equal to tweet's number of words of length due to word pairs
  let totalWords = numWords1 + numWords2 + numWords3;
  let totalLen = len1 + len2 + len3;
  let pass = false;
  // Pretty much arbitrary numbers below.
  if (
    // For short tweets
    (
      numWords1 + numWords2 >= (totalWords - 2) / 2 ||
      len1 + len2 >= (totalLen - 5) / 2
    ) && (
      numWords1 + numWords3 >= (totalWords - 2) / 2 ||
      len1 + len3 >= (totalLen - 5) / 2
    ) && (
      numWords2 + numWords3 >= (totalWords - 2) / 2 ||
      len2 + len3 >= (totalLen - 5) / 2
    )
  ) pass = true;
  if (
    // For longer tweers
    (numWords1 + numWords2 >= 7 || len1 + len2 >= 35) &&
    (numWords1 + numWords3 >= 7 || len1 + len3 >= 35) &&
    (numWords2 + numWords3 >= 7 || len2 + len3 >= 35)
  ) pass = true;

  tweet = S.unescapeHTML(tweet);
  // Try to avoid unfinished quotes
  if (S.count(tweet, '"') == 1) {
    tweet = tweet.replace('"', '');
  }
  return (pass && tweet.length < C.MAX_TWEET_CHARS ? tweet : false);
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
  let array = H.lowercaseSplitInWords(text);
  let keywords = "";
  for (let i = 0; i < 3; i ++) {
    let keyword = H.popRandom(array);
    if (keyword === false) break;
    if (keyword && !stopwords.includes(keyword)) {
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
      if (
        H.containsMediaWord(tweet) ||
        tweet.substr(tweet.length - 2).includes(":")
      ) {
        rand = H.random(C.GIF_REGULAR_CHANCE + C.IMGUR_REGULAR_CHANCE);
      }
      if (rand < C.GIF_REGULAR_CHANCE) {
        mediaId = await generateGif(tweet);
      } else if (rand < C.GIF_REGULAR_CHANCE + C.IMGUR_REGULAR_CHANCE) {
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
      tweet = false;
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
      if (
        H.containsMediaWord(tweet) ||
        tweet.substr(tweet.length - 2).includes(":")
      ) {
        rand = H.random(C.GIF_REGULAR_CHANCE + C.IMGUR_REGULAR_CHANCE);
      }
      if (rand < C.GIF_REGULAR_CHANCE) {
        mediaId = await generateGif(tweet);
      } else if (rand < C.GIF_REGULAR_CHANCE + C.IMGUR_REGULAR_CHANCE) {
        mediaId = await generateImgur(tweet);
      }
      console.log("(*** TWEET ***)", tweet);
    } catch (err) {
      console.error("ERROR: ", err);
      tweet = false;
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
