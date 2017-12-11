"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  TIME_BETWEEN_TWEETS: 60000 * 20,

  GIF_REGULAR_CHANCE: 0.1,
  IMGUR_REGULAR_CHANCE: 0.2,

  MAX_TWEET_THIRD_LEN: 14,
  MAX_TWEET_THIRD_FORCED_LEN: 18,

  MAX_TWEET_CHARS: 280,

  SPECIAL_CHAR_DISCARDS_ALLOWED: 3,

  /* Careful with the three below, as the search mode also depend on them */
  THIRD_1_RETRIES_ALLOWED: 1,
  THIRD_2_RETRIES_ALLOWED: 3,
  THIRD_3_RETRIES_ALLOWED: 3
};