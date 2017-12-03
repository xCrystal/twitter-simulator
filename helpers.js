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

  popRandom: function(list) {
    let length = list.length;
    let index = randomDiscrete(length);
    let element = list[index];
    list[index] = list[length - 1];
    list.pop();
    return element;
  },

}
