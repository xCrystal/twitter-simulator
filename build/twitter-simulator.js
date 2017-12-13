'use strict';

var _http = require('http');

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _twitter = require('twitter');

var _twitter2 = _interopRequireDefault(_twitter);

var _giphyApi = require('giphy-api');

var _giphyApi2 = _interopRequireDefault(_giphyApi);

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _fetchBase = require('fetch-base64');

var _fetchBase2 = _interopRequireDefault(_fetchBase);

var _underscore = require('underscore.string');

var _underscore2 = _interopRequireDefault(_underscore);

var _helpers = require('./helpers');

var _helpers2 = _interopRequireDefault(_helpers);

var _twitterWords = require('./twitter-words');

var _twitterWords2 = _interopRequireDefault(_twitterWords);

var _stopwords = require('./stopwords');

var _stopwords2 = _interopRequireDefault(_stopwords);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require("babel-polyfill");


var PORT = process.env.PORT || 8080;
var app = new _express2.default();
var server = new _http.Server(app);
server.listen(PORT);
app.get('*', function (req, res) {
  res.sendStatus(200);
});

var CONFIG = {};
try {
  CONFIG = require("./config").CONFIG;
} catch (e) {
  CONFIG = {
    "twitter": {
      "consumer_key": process.env.TWITTER_CONSUMER_KEY,
      "consumer_secret": process.env.TWITTER_CONSUMER_SECRET,
      "access_token_key": process.env.TWITTER_ACCESS_TOKEN_KEY,
      "access_token_secret": process.env.TWITTER_ACCESS_TOKEN_SECRET
    },
    "giphy": {
      "key": process.env.GIPHY_KEY
    },
    "imgur": {
      "id": process.env.IMGUR_ID
    }
  };
}
var T = new _twitter2.default(CONFIG.twitter);
var G = (0, _giphyApi2.default)(CONFIG.giphy.id);
var IMGUR_ID = CONFIG.imgur.id;

var search = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(word, type) {
    var since = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var until = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(!since || !until)) {
              _context.next = 6;
              break;
            }

            _context.next = 3;
            return T.get("search/tweets", {
              "q": word + " AND -filter:retweets",
              "lang": "en",
              "result_type": type,
              "tweet_mode": "extended",
              "count": 100
            });

          case 3:
            return _context.abrupt('return', _context.sent);

          case 6:
            _context.next = 8;
            return T.get("search/tweets", {
              "q": word + " AND -filter:retweets",
              "lang": "en",
              "since": since,
              "until": until,
              "result_type": type,
              "tweet_mode": "extended",
              "count": 100
            });

          case 8:
            return _context.abrupt('return', _context.sent);

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function search(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var sampleFormatTweet = function sampleFormatTweet(tweets) {
  var tweet = _helpers2.default.popRandom(tweets.statuses);
  var text = "";
  if (tweet) {
    text = _helpers2.default.clean(tweet.full_text);
    text = _helpers2.default.deleteLink(text);
    text = _helpers2.default.demention(text);
    tweet = { "text": text, "id": tweet.id_str };
  }
  return tweet;
};

var getTweetThird = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(word,
  // [numberOfThird, retriesLeft]
  searchMode) {
    var discardIds = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    var maxLen = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _constants2.default.MAX_TWEET_THIRD_LEN;
    var maxForcedLen = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : _constants2.default.MAX_TWEET_THIRD_FORCED_LEN;
    var getMode, mode, tweets, output, text, id, specialDiscardsLeft, minLen;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            getMode = function getMode() {
              var time = _helpers2.default.randomTimeInterval();
              var rand = _helpers2.default.random(1) > 0.5;
              // Compute the search mode (result type and time interval) depending on
              // which third, and on the number of times a search has already been tried
              switch (searchMode) {
                // [numberOfThird, retriesLeft]
                case [1, 0]:
                case [1, 1]:
                default:
                  return {
                    "type": "popular",
                    "since": rand ? 0 : time.since,
                    "until": rand ? 0 : time.until
                  };
                case [2, 0]:
                case [3, 0]:
                  return { "type": "popular", "since": 0, "until": 0 };
                case [2, 1]:
                case [2, 2]:
                case [2, 3]:
                case [3, 1]:
                case [3, 2]:
                case [3, 3]:
                  return { "type": "popular", "since": time.since, "until": time.until };
                case [2, 4]:
                case [2, 5]:
                case [3, 4]:
                case [3, 5]:
                  return { "type": "recent", "since": 0, "until": 0 };
              }
            };

            mode = getMode();
            _context2.next = 4;
            return search(word, mode.type, mode.since, mode.until);

          case 4:
            tweets = _context2.sent;
            output = "";
            text = "";
            id = "";
            // Tweets with mentions or hashtags tend to lead to unfunnier results,
            // so slightly discourage them.

            specialDiscardsLeft = _constants2.default.SPECIAL_CHAR_DISCARDS_ALLOWED;

          case 9:
            output = sampleFormatTweet(tweets);

            if (!(!output || !output.hasOwnProperty("text"))) {
              _context2.next = 12;
              break;
            }

            return _context2.abrupt('return', false);

          case 12:
            text = output.text;
            id = output.id;

          case 14:
            if (discardIds.includes(id) || // Ignore repeated tweet for special discard
            (text.includes("@") || text.includes("#")) && specialDiscardsLeft-- > 0) {
              _context2.next = 9;
              break;
            }

          case 15:
            if (text) {
              _context2.next = 17;
              break;
            }

            return _context2.abrupt('return', false);

          case 17:
            _context2.t0 = searchMode[0];
            _context2.next = _context2.t0 === 1 ? 20 : _context2.t0 === 2 ? 22 : _context2.t0 === 3 ? 25 : 27;
            break;

          case 20:
            output = _helpers2.default.strUntil(text, word, maxLen);
            return _context2.abrupt('break', 28);

          case 22:
            minLen = _helpers2.default.randomDiscrete(maxLen, 1);

            output = _helpers2.default.strBetween(text, word, minLen, maxForcedLen);
            return _context2.abrupt('break', 28);

          case 25:
            output = _helpers2.default.strFrom(text, word, maxLen);
            return _context2.abrupt('break', 28);

          case 27:
            output = "";

          case 28:
            if (!output) {
              _context2.next = 9;
              break;
            }

          case 29:

            output.id = id;
            console.log("(*", searchMode[0], " - ", id, "*)", output.text);
            return _context2.abrupt('return', output.text === " " ? false : output);

          case 32:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function getTweetThird(_x5, _x6) {
    return _ref2.apply(this, arguments);
  };
}();

var generateTweet = function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
    var tweet, text1, text2, text3, word, _word, word_, word2, _word2, word2_, nextWord, nextWord2, firstOut, secondOut, thirdOut, i, retriesLeft, numWords1, numWords2, numWords3, len1, len2, len3, totalWords, totalLen, pass;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            tweet = "";
            text1 = "", text2 = "", text3 = "";
            word = "", _word = "", word_ = "";
            word2 = "", _word2 = "", word2_ = "";
            nextWord = "", nextWord2 = "";
            firstOut = "";
            secondOut = "";
            thirdOut = "";
            i = 0;

            do {
              i = _helpers2.default.randomDiscrete(_twitterWords2.default.length * 2, 0, -5);
            } while (i > _twitterWords2.default.length - 1);
            word = _twitterWords2.default[i];

            retriesLeft = _constants2.default.THIRD_1_RETRIES_ALLOWED;

          case 12:
            _word = "";
            word_ = "";
            _context3.next = 16;
            return getTweetThird(word, [1, retriesLeft]);

          case 16:
            firstOut = _context3.sent;

            if (firstOut) {
              _context3.next = 19;
              break;
            }

            return _context3.abrupt('continue', 25);

          case 19:
            text1 = firstOut.text;
            nextWord = firstOut.nextWord;
            // Check if we can have a pair of common words to hook the next part.
            _word = _helpers2.default.hasWordInAnyArray(text1, 2, [_twitterWords2.default, _stopwords2.default]);
            word_ = _helpers2.default.hasWordInAnyArray(nextWord, 1, [_twitterWords2.default, _stopwords2.default]);
            if (_word === "i") _word = "I";
            if (word_ === "i") word_ = "I";
            // If we don't have any result retry up to one time.

          case 25:
            if (retriesLeft-- > 0 && !firstOut) {
              _context3.next = 12;
              break;
            }

          case 26:
            if (firstOut) {
              _context3.next = 28;
              break;
            }

            return _context3.abrupt('return', false);

          case 28:
            tweet += text1;
            if (_word) {
              word = _word + " " + word;
            } else if (word_) {
              word = word + " " + word_;
              tweet += word_ + " ";
            }

            retriesLeft = _constants2.default.THIRD_2_RETRIES_ALLOWED;

          case 31:
            _word2 = "";
            word2_ = "";
            _context3.next = 35;
            return getTweetThird(word, [2, retriesLeft], firstOut.id);

          case 35:
            secondOut = _context3.sent;

            if (secondOut) {
              _context3.next = 38;
              break;
            }

            return _context3.abrupt('continue', 45);

          case 38:
            text2 = secondOut.text;
            word2 = secondOut.word;
            nextWord2 = secondOut.nextWord;
            // Check if we can have a pair of common words to hook the next part.
            _word2 = _helpers2.default.hasWordInAnyArray(text2, 2, [_twitterWords2.default, _stopwords2.default]);
            word2_ = _helpers2.default.hasWordInAnyArray(nextWord2, 1, [_twitterWords2.default, _stopwords2.default]);
            if (_word2 === "i") _word2 = "I";
            if (word2_ === "i") word2_ = "I";
            // If we don't have any result retry up to three times.

          case 45:
            if (retriesLeft-- > 0 && !secondOut) {
              _context3.next = 31;
              break;
            }

          case 46:
            if (secondOut) {
              _context3.next = 48;
              break;
            }

            return _context3.abrupt('return', false);

          case 48:
            tweet += text2;
            if (_word2) {
              word2 = _word2 + " " + word2;
            } else if (word2_) {
              word2 = word2 + " " + word2_;
              tweet += word2_ + " ";
            }

            retriesLeft = _constants2.default.THIRD_3_RETRIES_ALLOWED;

          case 51:
            _context3.next = 53;
            return getTweetThird(word2, [3, retriesLeft], [firstOut.id, secondOut.id]);

          case 53:
            thirdOut = _context3.sent;

            // Ending with a question tends to look awkward unless it is a
            // sentence on its own.
            if (thirdOut && thirdOut.text.includes("?") && !thirdOut.text.includes(".")) {
              thirdOut = null;
            }
            // If we don't have any result retry up to three times.

          case 55:
            if (retriesLeft-- > 0 && !thirdOut) {
              _context3.next = 51;
              break;
            }

          case 56:
            if (thirdOut) {
              _context3.next = 58;
              break;
            }

            return _context3.abrupt('return', false);

          case 58:
            text3 = thirdOut.text;
            tweet += text3;

            // Prevent tweets made almost exclusively of a single tweet
            numWords1 = _helpers2.default.numWords(text1);
            numWords2 = _helpers2.default.numWords(text2);
            numWords3 = _helpers2.default.numWords(text3);
            len1 = text1.length;
            len2 = text2.length;
            len3 = text3.length;
            // Not totally equal to tweet's number of words of length due to word pairs

            totalWords = numWords1 + numWords2 + numWords3;
            totalLen = len1 + len2 + len3;
            pass = false;
            // Pretty much arbitrary numbers below.

            if (
            // For short tweets
            (numWords1 + numWords2 >= (totalWords - 2) / 2 || len1 + len2 >= (totalLen - 5) / 2) && (numWords1 + numWords3 >= (totalWords - 2) / 2 || len1 + len3 >= (totalLen - 5) / 2) && (numWords2 + numWords3 >= (totalWords - 2) / 2 || len2 + len3 >= (totalLen - 5) / 2)) pass = true;
            if (
            // For longer tweers
            (numWords1 + numWords2 >= 7 || len1 + len2 >= 35) && (numWords1 + numWords3 >= 7 || len1 + len3 >= 35) && (numWords2 + numWords3 >= 7 || len2 + len3 >= 35)) pass = true;

            tweet = _underscore2.default.unescapeHTML(tweet);
            // Try to avoid unfinished quotes
            if (_underscore2.default.count(tweet, '"') == 1) {
              tweet = tweet.replace('"', '');
            }
            return _context3.abrupt('return', pass && tweet.length < _constants2.default.MAX_TWEET_CHARS ? tweet : false);

          case 74:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function generateTweet() {
    return _ref3.apply(this, arguments);
  };
}();

var uploadMediaToTwitter = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(base64, mimeType) {
    var media, mediaId;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            media = new Buffer(base64[0], "base64");
            _context4.next = 3;
            return T.post("media/upload", {
              "command": "INIT",
              "total_bytes": media.length,
              "media_type": mimeType
            });

          case 3:
            mediaId = _context4.sent.media_id_string;
            _context4.next = 6;
            return T.post("media/upload", {
              "command": "APPEND",
              "media_id": mediaId,
              "media": media,
              "segment_index": 0
            });

          case 6:
            _context4.next = 8;
            return T.post("media/upload", {
              "command": "FINALIZE",
              "media_id": mediaId
            });

          case 8:
            return _context4.abrupt('return', mediaId);

          case 9:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function uploadMediaToTwitter(_x10, _x11) {
    return _ref4.apply(this, arguments);
  };
}();

var createMediaKeywords = function createMediaKeywords(text) {
  text = text.replace(/[^A-Za-z ]/g, "");
  var array = _helpers2.default.lowercaseSplitInWords(text);
  var keywords = "";
  for (var i = 0; i < 3; i++) {
    var keyword = _helpers2.default.popRandom(array);
    if (keyword === false) break;
    if (keyword && !_stopwords2.default.includes(keyword)) {
      keywords += keyword + " ";
    } else {
      i--;
    }
  }
  console.log("(*** Keywords ***)", keywords);
  return keywords;
};

var generateGif = function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(tweet) {
    var keywords, gif, data, i, url, base64;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            keywords = createMediaKeywords(tweet);
            _context5.next = 3;
            return G.search({ "q": keywords, "rating": "pg-13" });

          case 3:
            gif = _context5.sent;
            data = gif.data;

            if (!(data.length && data[0].hasOwnProperty("images"))) {
              _context5.next = 15;
              break;
            }

            i = _helpers2.default.randomDiscrete(data.length, 0, -2);
            url = data[i].images.fixed_height.url;
            _context5.next = 10;
            return _fetchBase2.default.remote(url);

          case 10:
            base64 = _context5.sent;

            console.log("(*** MEDIA ***)", url);
            _context5.next = 14;
            return uploadMediaToTwitter(base64, "image/gif");

          case 14:
            return _context5.abrupt('return', _context5.sent);

          case 15:
            return _context5.abrupt('return', false);

          case 16:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, undefined);
  }));

  return function generateGif(_x12) {
    return _ref5.apply(this, arguments);
  };
}();

var generateImgur = function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(tweet) {
    var IMGUR_URL, HEADER, req, keywords, results, res1, res2, res3, res1l, res2l, res3l, result, getImage, base64;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            IMGUR_URL = "https://api.imgur.com/3/gallery/t/";
            HEADER = { "Authorization": "Client-ID " + IMGUR_ID };

            req = function () {
              var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(keyword) {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return (0, _nodeFetch2.default)(IMGUR_URL + keyword, {
                          headers: HEADER
                        });

                      case 2:
                        return _context6.abrupt('return', _context6.sent);

                      case 3:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, undefined);
              }));

              return function req(_x14) {
                return _ref7.apply(this, arguments);
              };
            }();

            keywords = createMediaKeywords(tweet).split(" ");

            if (!(keywords.length < 3)) {
              _context7.next = 6;
              break;
            }

            return _context7.abrupt('return', false);

          case 6:
            _context7.next = 8;
            return Promise.all([req(keywords[0]), req(keywords[1]), req(keywords[2])]);

          case 8:
            results = _context7.sent;
            _context7.next = 11;
            return results[0].json();

          case 11:
            res1 = _context7.sent;
            _context7.next = 14;
            return results[1].json();

          case 14:
            res2 = _context7.sent;
            _context7.next = 17;
            return results[2].json();

          case 17:
            res3 = _context7.sent;
            res1l = res1.data.total_items;
            res2l = res2.data.total_items;
            res3l = res3.data.total_items;

            if (!(!res1l && !res2l && !res3l)) {
              _context7.next = 23;
              break;
            }

            return _context7.abrupt('return', false);

          case 23:
            result = {};

            getImage = function getImage(res) {
              var result = false;
              if (res.data.hasOwnProperty("items") && res.data.items.length) {
                var items = res.data.items;
                var currentScore = 0,
                    targetScore = 1000;
                var item = {};
                do {
                  // This serves a double purpose: favor popular media, and discard
                  // results with low overall interaction volume.
                  item = _helpers2.default.popRandom(items);
                  if (!item) return false;
                  if (item.nsfw) continue;
                  var tf = Math.cbrt((new Date().getTime() - item.datetime * 1000) / 60000);
                  var sf = item.ups + item.views / 20;
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

            if (result) {
              _context7.next = 28;
              break;
            }

            return _context7.abrupt('return', false);

          case 28:
            _context7.next = 30;
            return _fetchBase2.default.remote(result.link);

          case 30:
            base64 = _context7.sent;

            console.log("(*** MEDIA ***)", result.link);
            _context7.next = 34;
            return uploadMediaToTwitter(base64, result.type);

          case 34:
            return _context7.abrupt('return', _context7.sent);

          case 35:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, undefined);
  }));

  return function generateImgur(_x13) {
    return _ref6.apply(this, arguments);
  };
}();

var postTweet = function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8() {
    var tweet, mediaId, rand;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            tweet = false;
            mediaId = false;
            rand = _helpers2.default.random(1);

          case 3:
            _context8.prev = 3;
            _context8.next = 6;
            return generateTweet();

          case 6:
            tweet = _context8.sent;

            if (tweet) {
              _context8.next = 9;
              break;
            }

            return _context8.abrupt('continue', 36);

          case 9:
            if (_helpers2.default.containsMediaWord(tweet) || tweet.substr(tweet.length - 2).includes(":")) {
              rand = _helpers2.default.random(_constants2.default.GIF_REGULAR_CHANCE + _constants2.default.IMGUR_REGULAR_CHANCE);
            }

            if (!(rand < _constants2.default.GIF_REGULAR_CHANCE)) {
              _context8.next = 16;
              break;
            }

            _context8.next = 13;
            return generateGif(tweet);

          case 13:
            mediaId = _context8.sent;
            _context8.next = 20;
            break;

          case 16:
            if (!(rand < _constants2.default.GIF_REGULAR_CHANCE + _constants2.default.IMGUR_REGULAR_CHANCE)) {
              _context8.next = 20;
              break;
            }

            _context8.next = 19;
            return generateImgur(tweet);

          case 19:
            mediaId = _context8.sent;

          case 20:
            if (!(tweet && !mediaId)) {
              _context8.next = 25;
              break;
            }

            _context8.next = 23;
            return T.post("statuses/update", {
              "status": tweet
            });

          case 23:
            _context8.next = 28;
            break;

          case 25:
            if (!(tweet && mediaId)) {
              _context8.next = 28;
              break;
            }

            _context8.next = 28;
            return T.post("statuses/update", {
              "status": tweet,
              "media_ids": mediaId
            });

          case 28:
            ;
            console.log("(*** TWEET ***)", tweet);
            _context8.next = 36;
            break;

          case 32:
            _context8.prev = 32;
            _context8.t0 = _context8['catch'](3);

            console.error("ERROR: ", _context8.t0);
            tweet = false;

          case 36:
            if (!tweet) {
              _context8.next = 3;
              break;
            }

          case 37:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, undefined, [[3, 32]]);
  }));

  return function postTweet() {
    return _ref8.apply(this, arguments);
  };
}();

var testTweet = function () {
  var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9() {
    var tweet, mediaId, rand;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            tweet = false;
            mediaId = false;
            rand = _helpers2.default.random(1);

          case 3:
            _context9.prev = 3;
            _context9.next = 6;
            return generateTweet();

          case 6:
            tweet = _context9.sent;

            if (tweet) {
              _context9.next = 9;
              break;
            }

            return _context9.abrupt('continue', 27);

          case 9:
            if (_helpers2.default.containsMediaWord(tweet) || tweet.substr(tweet.length - 2).includes(":")) {
              rand = _helpers2.default.random(_constants2.default.GIF_REGULAR_CHANCE + _constants2.default.IMGUR_REGULAR_CHANCE);
            }

            if (!(rand < _constants2.default.GIF_REGULAR_CHANCE)) {
              _context9.next = 16;
              break;
            }

            _context9.next = 13;
            return generateGif(tweet);

          case 13:
            mediaId = _context9.sent;
            _context9.next = 20;
            break;

          case 16:
            if (!(rand < _constants2.default.GIF_REGULAR_CHANCE + _constants2.default.IMGUR_REGULAR_CHANCE)) {
              _context9.next = 20;
              break;
            }

            _context9.next = 19;
            return generateImgur(tweet);

          case 19:
            mediaId = _context9.sent;

          case 20:
            console.log("(*** TWEET ***)", tweet);
            _context9.next = 27;
            break;

          case 23:
            _context9.prev = 23;
            _context9.t0 = _context9['catch'](3);

            console.error("ERROR: ", _context9.t0);
            tweet = false;

          case 27:
            if (!tweet) {
              _context9.next = 3;
              break;
            }

          case 28:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, undefined, [[3, 23]]);
  }));

  return function testTweet() {
    return _ref9.apply(this, arguments);
  };
}();

_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10() {
  return regeneratorRuntime.wrap(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          if (PORT === 8080) {
            testTweet();
          } else {
            setInterval(postTweet, _constants2.default.TIME_BETWEEN_TWEETS);
          }

        case 1:
        case 'end':
          return _context10.stop();
      }
    }
  }, _callee10, undefined);
}))();