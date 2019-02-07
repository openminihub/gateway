// const db = require('../models')
var SunCalc = require('suncalc')
const Config = require('../config')
var Schedule = require('node-schedule')
var debug = require('debug')('suncalc')
var _suncalc_job

module.exports = {
    getTimes: (date, position) => {
        var response = new Object()
        var times = SunCalc.getTimes(date, position.latitude, position.longitude);
        response.sunrise = times.sunrise
        response.sunset = times.sunset
        debug('response: %o', response)
    },

    getNextAction: (position) => {
        date = new Date()
        // sunrise = 1, sunset = 0
        var response = new Object()
        var times = SunCalc.getTimes(date, position.latitude, position.longitude);
        response.time = times.sunset
        if (date > times.sunset) {
            date.setHours(date.getHours() + 24)
            var times = SunCalc.getTimes(date, position.latitude, position.longitude)
            response.action = 1
            response.time = times.sunrise
        } else if (date > times.sunrise) {
            response.action = 0
            response.time = times.sunset
        } else {
            response.action = 1
            response.time = times.sunrise
        }
        debug('response: %o', response)
        return response
    },

    scheduleNextAction: (position) => {
        var _gwConfig = Config.load()
        var _sun_action = module.exports.getNextAction(_gwConfig.position)
        var _suncalc_job = Schedule.scheduleJob('20 * * * *', function () {
            console.log('The answer to life, the universe, and everything!');
        })
        var _suncalc_job = Schedule.scheduleJob(_sun_action.time, function () {
            console.log('The answer to life, the universe, and everything!');
        })
    }

}