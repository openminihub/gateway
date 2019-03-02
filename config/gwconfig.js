module.exports = {
  load: () => {
    var config = {}
    try {
      config = require(__dirname + '/gateway.json')
    }
    catch (err) {
      config = require(__dirname + '/gateway.sample.json')
    }
    return config
  },

  formatConsoleOutput: () => {
    var log = console.log
    console.log = function () {
      var first_parameter = arguments[0]
      var other_parameters = ''
      if (arguments.length > 1)
        other_parameters = Array.prototype.slice.call(arguments, 1)

      function formatConsoleDate(date) {
        // var day = date.getDate()
        // var month = date.getMonth()
        // var year = date.getFullYear()
        var hour = date.getHours()
        var minutes = date.getMinutes()
        var seconds = date.getSeconds()
        var milliseconds = date.getMilliseconds()
        return '[' +
          ((hour < 10) ? '0' + hour : hour) +
          ':' +
          ((minutes < 10) ? '0' + minutes : minutes) +
          ':' +
          ((seconds < 10) ? '0' + seconds : seconds) +
          '.' +
          ('00' + milliseconds).slice(-3) +
          '] '
      }
      log.apply(console, [formatConsoleDate(new Date()) + first_parameter.trim()].concat(other_parameters))
    }
  }

}