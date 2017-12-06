import Twitter from 'twitter'
import Giphy from 'giphy-api'
import fetch from 'fetch-base64'
import decode from 'unescape'

import config from './twitter-config'
import H from './helpers'
import commonWords from './words'
import C from './constants'

const T = new Twitter(config);
const G = Giphy("dc6zaTOxFJmzC"); //TODO

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
    i = H.randomDiscrete((commonWords.length * 2), 0, -5);
  } while (i > commonWords.length - 1);
  word = commonWords[i];

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
  tweet = decode(tweet);
  return (tweet.length < C.MAX_CHARS ? tweet : false);
};

const uploadGifToTwitter = async (base64) => {
  let gif = new Buffer(base64[0], "base64");
  console.log(gif.length)
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

const generateGif = async () => {
  let gif = await G.search("door elephant phone"); //TODO
  let data = gif.data;
  let i = H.randomDiscrete(data.length - 1, 0, -2);
  let url = data[i].images.fixed_height.url;
  let base64 = await fetch.remote(url);
  console.log("(*** MEDIA ***)", url);
  return await uploadGifToTwitter(base64);
};

(async () => {
  let tweet = false;
  let gifId = false;
  do {
    try {
      tweet = await generateTweet();
      if (tweet) gifId = await generateGif();
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
  } while (!tweet);
}) ();
