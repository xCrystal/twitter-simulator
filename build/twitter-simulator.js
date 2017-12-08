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
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(word, since, until) {
    var type = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "popular";
    var count = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 100;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return T.get("search/tweets", {
              "q": word + " AND -filter:retweets",
              "lang": "en",
              "since": since,
              "until": until,
              "result_type": type,
              "tweet_mode": "extended",
              "count": count
            });

          case 2:
            return _context.abrupt('return', _context.sent);

          case 3:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function search(_x, _x2, _x3) {
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
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(word, whichThird) {
    var discardIds = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    var maxLen = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _constants2.default.MAX_STRLEN;
    var maxForcedLen = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : _constants2.default.MAX_FORCED_STRLEN;
    var maxSpecialDiscards = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 2;
    var time, tweets, output, text, id, minLen;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            time = _helpers2.default.randomTimeInterval();
            _context2.next = 3;
            return search(word, time.since, time.until, "popular", 100);

          case 3:
            tweets = _context2.sent;
            output = "";
            text = "";
            id = "";

          case 7:
            do {
              output = sampleFormatTweet(tweets);
              text = output.text;
              id = output.id;
            } while (discardIds.indexOf(id) > -1 || maxSpecialDiscards-- > 0 && (text.indexOf("@") > -1 || text.indexOf("#") > -1));

            if (text) {
              _context2.next = 10;
              break;
            }

            return _context2.abrupt('return', false);

          case 10:
            _context2.t0 = whichThird;
            _context2.next = _context2.t0 === "first" ? 13 : _context2.t0 === "second" ? 15 : _context2.t0 === "third" ? 18 : 20;
            break;

          case 13:
            output = _helpers2.default.strUntil(text, word, maxLen);
            return _context2.abrupt('break', 21);

          case 15:
            minLen = _helpers2.default.randomDiscrete(maxLen, 1);

            output = _helpers2.default.strBetween(text, word, minLen, maxForcedLen);
            return _context2.abrupt('break', 21);

          case 18:
            output = _helpers2.default.strFrom(text, word, maxLen);
            return _context2.abrupt('break', 21);

          case 20:
            output = "";

          case 21:
            if (!output) {
              _context2.next = 7;
              break;
            }

          case 22:

            output.id = id;
            console.log("(*", whichThird, "*)", output.text);
            return _context2.abrupt('return', output);

          case 25:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function getTweetThird(_x6, _x7) {
    return _ref2.apply(this, arguments);
  };
}();

var generateTweet = function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
    var tweet, word, word2, firstOut, secondOut, thirdOut, i;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            tweet = "";
            word = "";
            word2 = "";
            firstOut = "";
            secondOut = "";
            thirdOut = "";
            i = 0;

            do {
              i = _helpers2.default.randomDiscrete(_twitterWords2.default.length * 2, 0, -5);
            } while (i > _twitterWords2.default.length - 1);
            word = _twitterWords2.default[i];

            _context3.next = 11;
            return getTweetThird(word, "first");

          case 11:
            firstOut = _context3.sent;

            if (firstOut) {
              _context3.next = 14;
              break;
            }

            return _context3.abrupt('return', false);

          case 14:
            tweet += firstOut.text;

            _context3.next = 17;
            return getTweetThird(word, "second", firstOut.id);

          case 17:
            secondOut = _context3.sent;

            if (secondOut) {
              _context3.next = 20;
              break;
            }

            return _context3.abrupt('return', false);

          case 20:
            tweet += secondOut.text;
            word2 = secondOut.word;

            _context3.next = 24;
            return getTweetThird(word2, "third", [firstOut.id, secondOut.id]);

          case 24:
            thirdOut = _context3.sent;

            if (thirdOut) {
              _context3.next = 27;
              break;
            }

            return _context3.abrupt('return', false);

          case 27:
            tweet += thirdOut.text;
            tweet = _underscore2.default.unescapeHTML(tweet);
            return _context3.abrupt('return', tweet.length < _constants2.default.MAX_CHARS ? tweet : false);

          case 30:
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

  return function uploadMediaToTwitter(_x12, _x13) {
    return _ref4.apply(this, arguments);
  };
}();

var createMediaKeywords = function createMediaKeywords(text) {
  text = text.replace(/[^A-Za-z ]/g, "");
  var array = text.toLowerCase().split("\n").join(" ").split(" ");
  var keywords = "";
  for (var i = 0; i < 3; i++) {
    var keyword = _helpers2.default.popRandom(array);
    if (keyword === false) break;
    if (keyword && _stopwords2.default.indexOf(keyword) === -1) {
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

  return function generateGif(_x14) {
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

              return function req(_x16) {
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

  return function generateImgur(_x15) {
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

            return _context8.abrupt('continue', 35);

          case 9:
            if (tweet.substr(tweet.length - 1) === ":") rand /= 2.5;

            if (!(rand < 0.15)) {
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
            if (!(rand < 0.4)) {
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
            _context8.next = 35;
            break;

          case 32:
            _context8.prev = 32;
            _context8.t0 = _context8['catch'](3);

            console.error("ERROR: ", _context8.t0);

          case 35:
            if (!tweet) {
              _context8.next = 3;
              break;
            }

          case 36:
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

_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9() {
  return regeneratorRuntime.wrap(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          setInterval(postTweet, _constants2.default.TIME_BETWEEN_TWEETS);

        case 1:
        case 'end':
          return _context9.stop();
      }
    }
  }, _callee9, undefined);
}))();