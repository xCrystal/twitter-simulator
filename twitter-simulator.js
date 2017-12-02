import { Twitter } from 'twitter-node-client'
import config from './twitter-config'

const twitter = new Twitter(config);
const error = (err) => {
  console.log(err);
};
const success = (data) => {
  console.log(data);
};

twitter.getTweet({ id: '1111111111' }, error, success);
