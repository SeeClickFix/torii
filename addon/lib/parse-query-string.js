import EmberObject from '@ember/object';

export default EmberObject.extend({
  init() {
    this.validKeys = this.keys;
  },

  parse() {
    var url = this.url,
      validKeys = this.validKeys,
      data = {};

    for (var i = 0; i < validKeys.length; i++) {
      var key = validKeys[i],
        regex = new RegExp(key + '=([^&#]*)'),
        match = regex.exec(url);
      if (match) {
        data[key] = match[1];
      }
    }
    return data;
  },
});
