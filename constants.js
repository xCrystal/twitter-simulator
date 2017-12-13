export default {
  TIME_BETWEEN_TWEETS: 60000 * 20,

  /* Temporarily tend to 0. With the current search method, they tend to
  ruin the tweet if anything. Might come up with something better soon. */
  GIF_REGULAR_CHANCE: 0,
  IMGUR_REGULAR_CHANCE: 0,

  /* Length of each third will be between 1 and MAX_TWEET_THIRD_LEN */
  MAX_TWEET_THIRD_LEN: 14,
  /* The middle third can be as long as MAX_TWEET_THIRD_FORCED_LEN if needed */
  MAX_TWEET_THIRD_FORCED_LEN: 18,

  MAX_TWEET_CHARS: 280,

  /* How many strings with mentions or hashtags may be discarded per third */
  SPECIAL_CHAR_DISCARDS_ALLOWED: 4,

  /* Careful with the three below, as the search mode also depend on them */
  /* How many searches may be performed per third before dropping the tweet */
  THIRD_1_RETRIES_ALLOWED: 1,
  THIRD_2_RETRIES_ALLOWED: 5,
  THIRD_3_RETRIES_ALLOWED: 5,
}
