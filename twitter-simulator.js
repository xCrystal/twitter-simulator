import { Twitter } from 'twitter-node-client'
import config from './twitter-config'
import words from './words.js'

const T = new Twitter(config);
const error = (err) => {
  console.log('ERR ->', err);
};
const success = (data) => {
  data = JSON.parse(data);
  for (let status of data.statuses) {
    console.log(
      "********************************************************************\n",
      "ID:", status.id_str, "\n",
      "Date:", status.created_at, "\n",
      status.retweet_count, "RTs /", status.favorite_count, "favs", "\n",
      "By:", status.user.name, "\n",
      status.full_text,
    )
  }
};

const rnd = () => Math.random();
const days = (n) => 1000 * 60 * 60 * 24 * n;
let delta = Math.min(rnd(), rnd()) * days(9);
let curTime = new Date().getTime();
let word = '"' + words[
  Math.floor(
    Math.min(rnd(), rnd(), rnd(), rnd()) * words.length
  )
] + '\u0020"';
console.log("THE WORD IS", word, ".");

T.getSearch({
  "q": word + " AND -filter:retweets",
  "lang": "en",
  "since": new Date(curTime - delta),
  "until": new Date(curTime - delta + days(1)),
  "result_type": "popular",
  "tweet_mode": "extended",
  "count": 8
}, error, success);
