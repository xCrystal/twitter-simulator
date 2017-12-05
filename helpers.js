import S from 'underscore.string'

import commonWords from './words'
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
    let delta = this.random(days(10), 0, -2);
    let curTime = new Date().getTime();
    return {
      "since": new Date(curTime - delta),
      "until": new Date(curTime - delta + days(3)),
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

  /* Returns falsey if no applicable match */
  strUntil: function (str, word, withinFirst = C.MAX_CHARS) {
    word = " " + word + " ";
    let _str = S.strLeft(str, word);
    let foundWithin = S.count(_str, " ") + S.count(_str, "\n");
    return ((_str === str || foundWithin >= withinFirst) ? "" : _str + word);
  },

  /* Returns falsey if no applicable match */
  strFrom: function (str, word, withinLast = C.MAX_CHARS) {
    word = " " + word + " ";
    let _str = S.strRightBack(str, word);
    let foundWithin = S.count(_str, " ") + S.count(_str, "\n");
    return ((_str === str || foundWithin >= withinLast) ? "" : _str);
  },

  /* Returns falsey if no applicable match */
  /* Otherwise returns, in an object, both the string and the new word */
  strBetween: function (
    str,
    word,
    nextWordAt, /* translates to min length, an to ~(avg_len - 1) */
    beforeLast = C.MAX_CHARS, /* translates to max length */
  ) {
    word = " " + word + " ";
    let _str = S.strRight(str, word);
    let foundBefore = S.count(_str, " ") + S.count(_str, "\n");
    if (_str === str || foundBefore > beforeLast) return "";
    let ar = S.words(_str, " ");
    do {
      let closingWord = ar[nextWordAt];
      if (commonWords.indexOf(closingWord) > -1) {
        _str = S.strLeft(_str, " " + closingWord + " ");
        if (_str !== str) {
          return { str: _str + " " + closingWord + " ", word: closingWord };
        }
      }
      nextWordAt ++;
    } while (ar.length > nextWordAt);
    return "";
  },

  /* ARRAY */

  /* Returns falsey if array empty */
  popRandom: function (array) {
    let element = "";
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
