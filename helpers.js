import S from 'underscore.string'

import commonWords from './words'

const MAX_CHARS = 280;

export default {

  /* Random */

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

  /* String */

  clean: function (str) {
    return S.clean(str);
  },

  deleteLink: function (str) {
    return S.strLeft(str, "https://t.co/");
  },

  demention: function (str) {
    return S.map(str, (x) => {
      if(x === '@') x = '@·';
      return x;
    });
  },

  strUntil: function (str, word, withinFirst = MAX_CHARS) {
    word = ' ' + word + ' ';
    let _str = S.strLeft(str, word);
    let foundWithin = S.count(_str, " ") + S.count(_str, "\n");
    return ((_str === str || foundWithin >= withinFirst) ? "" : _str + word);
  },

  strFrom: function (str, word, withinLast = MAX_CHARS) {
    word = ' ' + word + ' ';
    let _str = S.strRightBack(str, word);
    let foundWithin = S.count(_str, " ") + S.count(_str, "\n");
    return ((_str === str || foundWithin >= withinLast) ? "" : _str);
  },

  strBetween: function (
    str,
    word,
    nextWordAt, /* translates to min length, an to ~(avg_len - 1) */
    beforeLast = MAX_CHARS, /* translates to max length */
  ) {
    word = ' ' + word + ' ';
    let _str = S.strRight(str, word);
    let foundBefore = S.count(_str, " ") + S.count(_str, "\n");
    if (_str === str || foundBefore < beforeLast) return "";
    let ar = S.words(_str, " ");
    do {
      if (commonWords.indexOf(ar[nextWordAt]) > -1) {
        _str = S.strLeft(_str, ar[nextWordAt]);
        return _str + ar[nextWordAt];
      }
      nextWordAt ++;
    } while (ar.length > nextWordAt);
    return "";
  },

  /* Array */

  popRandom: function (list) {
    let element = false;
    let length = list.length;
    if (length) {
      let index = randomDiscrete(length);
      element = list[index];
      list[index] = list[length - 1];
      list.pop();
    }
    return element;
  },

}
