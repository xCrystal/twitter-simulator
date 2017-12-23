import S from 'underscore.string'

import twitterwords from './twitter-words'
import C from './constants'

export default {

  /* RANDOM */

  random: function (max, min = 0, bias = false) {

    let randomBiased = (bias) => {
      let number = Math.random();
      if (bias < 0) {
        bias -= 2 * bias;
        for (let i = 0; i <= bias; i ++) {
          number = Math.min(Math.random(), number);
        }
      } else {
        for (let i = 0; i <= bias; i ++) {
          number = Math.max(Math.random(), number);
        }
      }
      return number;
    };

    return (bias ? randomBiased(bias) : Math.random()) * (max - min) + min;
  },

  randomDiscrete: function (max, min = 0, bias = false) {
    return Math.floor(this.random(max, min, bias));
  },

  randomTimeInterval: function () {
    const days = (n) => 1000 * 60 * 60 * 24 * n;
    const formatDate = (date) => date.toISOString().slice(0, 10);
    let curTime = new Date().getTime();
    let until = curTime - this.random(days(8), days(2));
    let since = until - days(2);
    return {
      "since": formatDate(new Date(since)),
      "until": formatDate(new Date(until)),
    };
  },

  /* STRING */

  clean: function (str) {
    return S.clean(str);
  },

  deleteLink: function (str) {
    return S.strLeft(str, "https://t.co/");
  },

  demention: function (str) {
    return S.map(str, (x) => {
      if(x === "@") x = "@·";
      return x;
    });
  },

  appendSpaces: function(word) {
    if (word === ".") {
      return word + " ";
    } else {
      return " " + word + " ";
    }
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns the resulting string in an object */
  strUntil: function (str, word, withinFirst = C.MAX_TWEET_CHARS) {
    word = this.appendSpaces(word);
    let _str = S.strLeft(str, word);
    // Don't separate by dot if it's an acronym.
    if (_str.charAt(_str.length - 2) === ".") return "";
    let nextWord = S.strRight(str, word);
    nextWord = S.strLeft(nextWord, " ");
    let foundWithin = this.numWords(_str);
    return (
      _str === str || !foundWithin || foundWithin >= withinFirst ?
      "" :
      { "text": _str + word, "nextWord": nextWord }
    );
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns the resulting string in an object */
  strFrom: function (str, word, withinLast = C.MAX_TWEET_CHARS) {
    word = this.appendSpaces(word);
    let _str = S.strRightBack(str, word);
    let foundWithin = this.numWords(_str);
    return (
      _str === str || !foundWithin || foundWithin >= withinLast ?
      "" :
      { "text": _str }
    );
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns, in an object, both the string and the new word */
  strBetween: function (
    str,
    word,
    nextWordAt, /* translates to min length, an to ~(avg_len - 1) */
    beforeLast = C.MAX_TWEET_CHARS, /* translates to max length */
  ) {
    word = this.appendSpaces(word);
    let _str = S.strRight(str, word);
    let foundBefore = this.numWords(_str);
    if (_str === str || !foundBefore || foundBefore > beforeLast) return "";
    let ar = this.splitInWords(_str);
    do {
      let closingWord = ar[nextWordAt];
      if (
        twitterwords.slice(0, C.LAST_HOOK_TWITTER_WORD).includes(closingWord)
      ) {
        _str = S.strLeft(_str, this.appendSpaces(closingWord));
        if (_str !== str) {
          let nextWord = S.strRightBack(str, closingWord);
          nextWord = S.strLeft(nextWord.substr(1, nextWord.length - 1), " ");
          return {
            "text": _str + this.appendSpaces(closingWord),
            "word": closingWord,
            "nextWord": nextWord
          };
        }
      }
      nextWordAt ++;
    } while (ar.length > nextWordAt);
    return "";
  },

  /* STRING -> ARRAY */

  discardTrailingSpace: function (array) {
    if (array[array.length - 1] === '') {
      array = array.slice(0, array.length - 1);
    }
    return array;
  },

  splitInWords: function (str) {
    let array = str.split("\n").join(" ").split(" ");
    return this.discardTrailingSpace(array);
  },

  lowercaseSplitInWords: function (str) {
    return this.splitInWords(str.toLowerCase());
  },

  numWords: function (str) {
    return this.splitInWords(str).length;
  },

  /* wordPos is counted from right to left or string */
  /* Returns, at index, 0 (falsey) if word is not found, index + 1 if found */
  hasWordInArray: function (str, wordPos, inArray) {
    let array = this.lowercaseSplitInWords(str);
    let word = array[array.length - wordPos];
    let index = inArray.indexOf(word) + 1;
    return { "word": word, "index": index };
  },

  containsMediaWord: function(str) {
    let mediaWords = [
      'picture',
      'video',
      'image',
      'photo',
      'footage',
      'coverage',
      'watch',
      'trailer',
    ];
    let array = this.lowercaseSplitInWords(str);
    do {
      let elem = array.pop();
      if (mediaWords.includes(elem)) {
        return true;
      }
    } while (array.length);
    return false;
  },

  /* ARRAY */

  /* Returns false if array empty */
  popRandom: function (array) {
    let element = false;
    let length = array.length;
    if (length) {
      let index = this.randomDiscrete(length);
      element = array[index];
      array[index] = array[length - 1];
      array.pop();
    }
    return element;
  },

}
