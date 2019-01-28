exports.load = function () {
  var config = {}
  try {
    config = require(__dirname + '/gateway.json')
  }
  catch(err) {
    config = require(__dirname + '/gateway.sample.json')
  }
  return config
}
