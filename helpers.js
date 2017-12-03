import s from 'underscore.string'

export default {

  random: function(max, min = 0, bias = false) {

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

  randomDiscrete: function(max, min = 0, bias = false) {
    return Math.floor(this.random(max, min, bias));
  },

  timeInterval: function() {
    const days = (n) => 1000 * 60 * 60 * 24 * n;
    let delta = this.random(days(10), 0, -2);
    let curTime = new Date().getTime();
    return {
      "since": new Date(curTime - delta),
      "until": new Date(curTime - delta + days(3)),
    };
  },

  clean: function(str) {
    return s.clean(str);
  },

  deleteLink: function(str) {
    return s.strLeft(str, "https://t.co/");
  },

  demention: function(str) {
    return s.map(str, (x) => {
      if(x === '@') x = '';
      return x;
    });
  },

  popRandom: function(list) {
    let length = list.length;
    let index = randomDiscrete(length);
    let element = list[index];
    list[index] = list[length - 1];
    list.pop();
    return element;
  },

}
