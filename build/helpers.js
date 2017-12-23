'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore.string');

var _underscore2 = _interopRequireDefault(_underscore);

var _twitterWords = require('./twitter-words');

var _twitterWords2 = _interopRequireDefault(_twitterWords);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {

  /* RANDOM */

  random: function random(max) {
    var min = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var bias = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;


    var randomBiased = function randomBiased(bias) {
      var number = Math.random();
      if (bias < 0) {
        bias -= 2 * bias;
        for (var i = 0; i <= bias; i++) {
          number = Math.min(Math.random(), number);
        }
      } else {
        for (var _i = 0; _i <= bias; _i++) {
          number = Math.max(Math.random(), number);
        }
      }
      return number;
    };

    return (bias ? randomBiased(bias) : Math.random()) * (max - min) + min;
  },

  randomDiscrete: function randomDiscrete(max) {
    var min = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var bias = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    return Math.floor(this.random(max, min, bias));
  },

  randomTimeInterval: function randomTimeInterval() {
    var days = function days(n) {
      return 1000 * 60 * 60 * 24 * n;
    };
    var formatDate = function formatDate(date) {
      return date.toISOString().slice(0, 10);
    };
    var curTime = new Date().getTime();
    var until = curTime - this.random(days(8), days(2));
    var since = until - days(2);
    return {
      "since": formatDate(new Date(since)),
      "until": formatDate(new Date(until))
    };
  },

  /* STRING */

  clean: function clean(str) {
    return _underscore2.default.clean(str);
  },

  deleteLink: function deleteLink(str) {
    return _underscore2.default.strLeft(str, "https://t.co/");
  },

  demention: function demention(str) {
    return _underscore2.default.map(str, function (x) {
      if (x === "@") x = "@·";
      return x;
    });
  },

  appendSpaces: function appendSpaces(word) {
    if (word === ".") {
      return word + " ";
    } else {
      return " " + word + " ";
    }
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns the resulting string in an object */
  strUntil: function strUntil(str, word) {
    var withinFirst = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _constants2.default.MAX_TWEET_CHARS;

    word = this.appendSpaces(word);
    var _str = _underscore2.default.strLeft(str, word);
    // Don't separate by dot if it's an acronym.
    if (_str.charAt(_str.length - 2) === ".") return "";
    var nextWord = _underscore2.default.strRight(str, word);
    nextWord = _underscore2.default.strLeft(nextWord, " ");
    var foundWithin = this.numWords(_str);
    return _str === str || !foundWithin || foundWithin >= withinFirst ? "" : { "text": _str + word, "nextWord": nextWord };
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns the resulting string in an object */
  strFrom: function strFrom(str, word) {
    var withinLast = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _constants2.default.MAX_TWEET_CHARS;

    word = this.appendSpaces(word);
    var _str = _underscore2.default.strRightBack(str, word);
    var foundWithin = this.numWords(_str);
    return _str === str || !foundWithin || foundWithin >= withinLast ? "" : { "text": _str };
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns, in an object, both the string and the new word */
  strBetween: function strBetween(str, word, nextWordAt) /* translates to max length */
  {
    var beforeLast = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _constants2.default.MAX_TWEET_CHARS;

    word = this.appendSpaces(word);
    var _str = _underscore2.default.strRight(str, word);
    var foundBefore = this.numWords(_str);
    if (_str === str || !foundBefore || foundBefore > beforeLast) return "";
    var ar = this.splitInWords(_str);
    do {
      var closingWord = ar[nextWordAt];
      if (_twitterWords2.default.slice(0, _constants2.default.LAST_HOOK_TWITTER_WORD).includes(closingWord)) {
        _str = _underscore2.default.strLeft(_str, this.appendSpaces(closingWord));
        if (_str !== str) {
          var nextWord = _underscore2.default.strRightBack(str, closingWord);
          nextWord = _underscore2.default.strLeft(nextWord.substr(1, nextWord.length - 1), " ");
          return {
            "text": _str + this.appendSpaces(closingWord),
            "word": closingWord,
            "nextWord": nextWord
          };
        }
      }
      nextWordAt++;
    } while (ar.length > nextWordAt);
    return "";
  },

  /* STRING -> ARRAY */

  discardTrailingSpace: function discardTrailingSpace(array) {
    if (array[array.length - 1] === '') {
      array = array.slice(0, array.length - 1);
    }
    return array;
  },

  splitInWords: function splitInWords(str) {
    var array = str.split("\n").join(" ").split(" ");
    return this.discardTrailingSpace(array);
  },

  lowercaseSplitInWords: function lowercaseSplitInWords(str) {
    return this.splitInWords(str.toLowerCase());
  },

  numWords: function numWords(str) {
    return this.splitInWords(str).length;
  },

  /* wordPos is counted from right to left or string */
  /* Returns, at index, 0 (falsey) if word is not found, index + 1 if found */
  hasWordInArray: function hasWordInArray(str, wordPos, inArray) {
    var array = this.lowercaseSplitInWords(str);
    var word = array[array.length - wordPos];
    var index = inArray.indexOf(word) + 1;
    return { "word": word, "index": index };
  },

  containsMediaWord: function containsMediaWord(str) {
    var mediaWords = ['picture', 'video', 'image', 'photo', 'footage', 'coverage', 'watch', 'trailer'];
    var array = this.lowercaseSplitInWords(str);
    do {
      var elem = array.pop();
      if (mediaWords.includes(elem)) {
        return true;
      }
    } while (array.length);
    return false;
  },

  /* ARRAY */

  /* Returns false if array empty */
  popRandom: function popRandom(array) {
    var element = false;
    var length = array.length;
    if (length) {
      var index = this.randomDiscrete(length);
      element = array[index];
      array[index] = array[length - 1];
      array.pop();
    }
    return element;
  }

};