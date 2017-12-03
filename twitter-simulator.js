import { Twitter } from 'twitter-node-client'
import config from './twitter-config'
import H from './helpers'
import words from './words'

const T = new Twitter(config);

let interval = H.randomTimeInterval();
let word = words[H.randomDiscrete(words.length, 0, -4)];
console.log("THE WORD IS", word, ".");

const error = (err) => {
  console.log('ERR ->', err);
};

const success = (data) => {
  data = JSON.parse(data);
  for (let status of data.statuses) {
    let text = H.clean(status.full_text);
    text = H.deleteLink(text);
    text = H.demention(text);
    let textUntil = H.strUntil(text, word, 10);
    let textFrom = H.strFrom(text, word, 10);
    console.log(
      "********************************************************************\n",
      "ID:", status.id_str, "\n",
      "Date:", status.created_at, "\n",
      status.retweet_count, "RTs /", status.favorite_count, "favs", "\n",
      "By:", status.user.name, "\n",
      "(*)", text, "\n",
      "(*)", textUntil, "\n",
      "(*)", textFrom,
    )
  }
};

T.getSearch({
  "q": word + " AND -filter:retweets",
  "lang": "en",
  "since": interval.since,
  "until": interval.until,
  "result_type": "popular",
  "tweet_mode": "extended",
  "count": 100
}, error, success);
