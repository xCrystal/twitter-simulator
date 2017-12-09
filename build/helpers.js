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
    var delta = this.random(days(12), 0);
    var curTime = new Date().getTime();
    return {
      "since": new Date(curTime - delta),
      "until": new Date(curTime - delta + days(4))
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

  /* Returns falsey if no applicable match */
  /* Otherwise returns the resulting string in an object */
  strUntil: function strUntil(str, word) {
    var withinFirst = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _constants2.default.MAX_CHARS;

    word = " " + word + " ";
    var _str = _underscore2.default.strLeft(str, word);
    var foundWithin = _underscore2.default.count(_str, " ") + _underscore2.default.count(_str, "\n");
    return _str === str || foundWithin >= withinFirst ? "" : { "text": _str + word };
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns the resulting string in an object */
  strFrom: function strFrom(str, word) {
    var withinLast = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _constants2.default.MAX_CHARS;

    word = " " + word + " ";
    var _str = _underscore2.default.strRightBack(str, word);
    var foundWithin = _underscore2.default.count(_str, " ") + _underscore2.default.count(_str, "\n");
    return _str === str || foundWithin >= withinLast ? "" : { "text": _str };
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns, in an object, both the string and the new word */
  strBetween: function strBetween(str, word, nextWordAt) /* translates to max length */
  {
    var beforeLast = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _constants2.default.MAX_CHARS;

    word = " " + word + " ";
    var _str = _underscore2.default.strRight(str, word);
    var foundBefore = _underscore2.default.count(_str, " ") + _underscore2.default.count(_str, "\n");
    if (_str === str || foundBefore > beforeLast) return "";
    var ar = this.splitInWords(_str);
    do {
      var closingWord = ar[nextWordAt];
      if (_twitterWords2.default.includes(closingWord)) {
        _str = _underscore2.default.strLeft(_str, " " + closingWord + " ");
        if (_str !== str) {
          return { text: _str + " " + closingWord + " ", word: closingWord };
        }
      }
      nextWordAt++;
    } while (ar.length > nextWordAt);
    return "";
  },

  /* STRING -> ARRAY */

  discardTrailingSpace: function discardTrailingSpace(array) {
    if (array[array.length - 1] === '') array.slice(0, array.length - 1);
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