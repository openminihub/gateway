const db = require('../models')
var debug = require('debug')('ESPurna')

exports.processMqttData = function (topic, message) {
    var _msg = topic.toString().split('/')

    switch (_msg[2]) {
        case 'relay':
            break
        case 'rfid':
            break
        default:
            var _node = new Object()
            switch (_msg[2]) {
                case 'app':
                    _node.type = message
                    break
                case 'version':
                    _node.version = message
                    break
                case 'board':
                    _node.board = message
                    break
                case 'host':
                    _node.name = message
                    break
                case 'rssi':
                    // _node.rssi = message
                    break
                case 'vcc':
                    _node.battery = message
                    break
            }
            debug('db.Nodes update: %o', _node)
            if (!_isEmptyObject(_node)) {
                _node.id = _msg[1]
                db.Nodes.upsert(_node)
                    .then(function () {
                    })
                    .catch((err) => {
                        console.log('%s', err)
                    })
            }
            break
    }
}


function _isEmptyObject(obj) {
    // return ((obj === undefined) || Object.keys(obj).length === 0 ? 1 : 0)
    return (typeof obj === 'undefined' || Object.keys(obj).length === 0 ? 1 : 0)
}