import Twitter from 'twitter'

import config from './twitter-config'
import H from './helpers'
import commonWords from './words'
import C from './constants'

const T = new Twitter(config);

const search = async (word, since, until, type = "popular", count = 100) => {
  try {
    let result = await T.get("search/tweets", {
      "q": word + " AND -filter:retweets",
      "lang": "en",
      "since": since,
      "until": until,
      "result_type": type,
      "tweet_mode": "extended",
      "count": count
    });
    return result;
  } catch (err) {
    console.error("ERROR: ", err);
  }
};

const sampleFormatTweet = (tweets) => {
  let tweet = H.popRandom(tweets.statuses);
  let text = "";
  if (tweet) {
    text = H.clean(tweet.full_text);
    text = H.deleteLink(text);
    text = H.demention(text);
  }
  return text;
};

const getTweetThird = async (
  word,
  whichThird,
  maxLen = C.MAX_STRLEN,
  maxForcedLen = C.MAX_FORCED_STRLEN
) => {
  let time = H.randomTimeInterval();
  let tweets = await search(word, time.since, time.until, "popular", 100);
  let output = "";

  do {
    output = sampleFormatTweet(tweets);
    if (!output) return false;
    switch (whichThird) {
      case "first":
        output = H.strUntil(output, word, maxLen);
        break;
      case "second":
        let minLen = H.randomDiscrete(maxLen, 1);
        output = H.strBetween(output, word, minLen, maxForcedLen);
        break;
      case "third":
        output = H.strFrom(output, word, maxLen);
        break;
      default:
        output = "";
    }
    if (output) console.log("(*", whichThird, "*)", output);
  } while (!output);

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
  tweet += firstOut;

  secondOut = await getTweetThird(word, "second");
  if (!secondOut) return false;
  tweet += secondOut.str;
  word2 = secondOut.word;

  thirdOut = await getTweetThird(word2, "third");
  if (!thirdOut) return false;
  tweet += thirdOut;
  return (tweet.length < C.MAX_CHARS ? tweet : false);
};

(async () => {
  let tweet = false;
  do {
    try {
      tweet = await generateTweet();
      //if (tweet) await T.post("statuses/update", { status: tweet });
      console.log(tweet);
    } catch (err) {
      console.error("ERROR: ", err);
    }
  } while (!tweet);
}) ();
