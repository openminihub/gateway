// const db = require('../models')
var SunCalc = require('suncalc')
var debug = require('debug')('suncalc')

exports.getTimes = function (date, position) {
    var times = SunCalc.getTimes(date, position.latitude, position.longitude);
    debug(times)
}