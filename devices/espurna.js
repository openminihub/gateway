const db = require('../models')
var debug = require('debug')('ESPurna')

exports.processMqttData = function (topic, message) {
    var _msg = topic
    message = message.toString()

    var _node = new Object()
    var _message = new Object()
    _message.node_id = _msg[1]
    _message.device_id = _msg[3]
    _message.value = message
    _message.rssi = 0

    switch (_msg[2]) {
        case 'status':
            _node.id = _msg[1]
            break
        case 'rgb':
            _message.messagetype_id = 40 // 40 = V_RGB
            break
        case 'relay':
            _message.messagetype_id = 2 // 2 = V_STATUS
            break
        case 'rfin':
            _message.device_id = message.substring(12)
            _message.messagetype_id = 16 // 16 = V_TRIPPED
            _message.value = '1'
            break
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
    if (!_isEmptyObject(_node)) {
        debug('db.Nodes update: %o', _node)
        _node.id = _msg[1]
        db.Nodes.upsert(_node)
            .then(function () {
            })
            .catch((err) => {
                console.log('%s', err)
            })
    }
    if (_message.hasOwnProperty('messagetype_id')) {
        debug('db.Messagess: %o', _message)
        db.Messages.update({ value: _message.value }, { where: { node_id: _message.node_id, device_id: _message.device_id, messagetype_id: _message.messagetype_id } })
            .then(rowsUpdated => _doInsertOnNewMessage(rowsUpdated, _message, message))
            .catch((err) => {
                console.log('%s', err)
            })
    }
}

function _doInsertOnNewMessage(rowsUpdated, values, message) {
    if (rowsUpdated == 0) {
        var _device = new Object()
        _device.node_id = values.node_id
        _device.id = values.device_id
        switch (values.messagetype_id) {
            case 16:
                _device.config = message.substring(0, 12)
                _device.devicetype_id = 1  // 1 = S_MOTION (Motion sensor)
                break
            case 2:
                _device.devicetype_id = 3  // 3 = S_BINARY (Binary device on/off)
                break
            case 40:
                _device.devicetype_id = 26  // 3 = S_RGB_LIGHT (RGB light)
                break
        }
        debug('Insert Devices.db: %o', _device)
        db.Devices.create(_device)
            .then(updatedRow => {
                // console.log(updatedRow.get({ plain: true }))
                // console.log('...inserted...')
                debug('Insert Messages.db: %o', values)
                db.Messages.create(values)
                    .then(updatedRow => {
                        // console.log(updatedRow.get({ plain: true }))
                        // console.log('...inserted...')
                    })
                    .catch((err) => {
                        console.log('%s', err)
                    })
            })
            .catch((err) => {
                console.log('%s', err)
            })
    }
}

function _isEmptyObject(obj) {
    // return ((obj === undefined) || Object.keys(obj).length === 0 ? 1 : 0)
    return (typeof obj === 'undefined' || Object.keys(obj).length === 0 ? 1 : 0)
}