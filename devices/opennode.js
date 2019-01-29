const db = require('../models')
var debug = require('debug')('OpenNode')
// const Sequelize = require('sequelize');
// const Op = Sequelize.Op


exports.processSerialData = function (rxmessage) {
    var _rxmessage = rxmessage.toString('utf8').trim()
    //take off all not valid symbols
    _rxmessage = _rxmessage.replace(/(\n|\r)+$/, '')
    var _rssi_idx = _rxmessage.indexOf('[RSSI:') //not found = -1
    var _message_rssi = 0
    if (_rssi_idx > 0) {
        _message_rssi = parseInt(_rxmessage.substr(_rssi_idx + 6, _rxmessage.length - 2))
        _rxmessage = _rxmessage.substr(0, _rssi_idx - 1)
    }
    /*
        //if FLX?OK then update firmware for OpenNode
        if (message == 'FLX?OK') {
            if (global.nodeTo) {
                readNextFileLine(global.hexFile, 0)
                console.log('Transfering firmware...')
            }
            return true
        }
        if (/^TO:.*:OK$/.test(message)) {
            if (global.nodeTo == 0) {
                var toMsg = message.toString().split(':')
                NodeDB.find({ _id: toMsg[1] }, function (err, entries) {
                    if (entries.length == 1) {
                        getAvailableFirmware(entries[0], function (newFirmare) {
                            if (newFirmare != "0") {
                                global.nodeTo = this.dbNode._id
                                global.hexFile = new readFile(newFirmare)
                                console.log('FW > %s', newFirmare)
                                serial.write('FLX?' + '\n', function () { serial.drain() })
                                // console.log('Request update for Node: %s update with FW', global.nodeTo)
                            }
                        }.bind({ dbNode: entries[0] }))
                    }
                })
                return true
            }
            else
                return false
        }
        if (message.toString().trim() == 'FLX?NOK') {
            console.log('Flashing failed!')
            global.nodeTo = 0
            return false
        }
        if (message.substring(0, (4 > message.length - 1) ? message.length - 1 : 4) == 'FLX:') {
            var flxMsg = message.toString().split(':')
            if (flxMsg[1].trim() == 'INV') {
                console.log('Flashing failed!')
                global.nodeTo = 0
                return false
            }
            else if (flxMsg[2].trim() == 'OK')
                readNextFileLine(global.hexFile, parseInt(flxMsg[1]) + 1)
            return true
        }
    */
    //Validate the Message structure: node-id ; device-id ; command ; ack ; msgtype ; payload
    var re = new RegExp("^(\d{1,3}\;\d{1,3}\;\d{1}\;\d{1}\;\d{1,3}\;.*)$");
    if (re.test(_rxmessage))
        return false
    //regular message
    console.log('RX   > %s RSSI: %s', _rxmessage, _message_rssi)

    //get node networkID
    var _msg = _rxmessage.toString().split(';')
    //node-id ; device-id ; command ; ack ; type ; payload \n
    //presentation-0, set-1, request-2, internal-3, stream-4
    switch (_msg[2]) {
        case '0': //presentation
            var _device = new Object()
            _device.id = _msg[1]
            _device.type = parseInt(_msg[4])
            _device.node_id = _msg[0]
            debug('Update Devices.db: %s %o', _device.node_id, _device)
            db.Devices.upsert(_device)
                .then(function () {
                })
                .catch((err) => {
                    console.log('%s', err)
                })
            // db.Devices.update(_device, { where: { id: _device.node_id } })
            //     .then(rowsUpdated => _doInsertOnNewDevice(rowsUpdated, _device))
            //     .catch((err) => {
            //         console.log('%s', err)
            //     })
            break
        case '1': //set
            var _message = new Object()
            _message.node_id = _msg[0]
            _message.device_id = _msg[1]
            _message.type = parseInt(_msg[4])
            _message.value = _msg[5]
            _message.rssi = _message_rssi
            // update Messages
            // set value = xxx
            // where device_id = (select id from Devices
            //                    where node_id = xxx)
            debug('Update Messages.db: %s %o', _message.node_id, _message )
            db.Messages.update({ value: _message.value, rssi: _message.rssi}, { where: { node_id: _message.node_id, device_id: _message.device_id, type: _message.type } })
                .then(rowsUpdated => _doInsertOnNewMessage(rowsUpdated, _message))
                .catch((err) => {
                    console.log('%s', err)
                })
            break
        case '3':  //internal
            var _node = new Object()
            _node.type = 'OpenNode'
            if (_msg[1] == 255) { //Internal contact
                _node.id = _msg[0]
                if (_msg[4] == '29') { //Change - I_HAS_CHANGE
                    // console.log('* I_HAS_CHANGE')          
                    // sendMessageToNode(message, entries.length)
                }
                if (_msg[4] == '11') { //Board - I_SKETCH_NAME
                    _node.board = _msg[5]
                    // NodeDB.update({ "_id": msg[0] }, { $set: { type: nodetype, board: msg[5] } }, { upsert: true, returnUpdatedDocs: true }, function (err, numAffected, affectedDocuments) {
                    //     if (!err && numAffected) {
                    //         if (isEmptyObject(affectedDocuments[0])) {
                    //             NodeDB.update({ "_id": this.id }, { $set: { name: this.name } }, { upsert: false })
                    //         } else if (!affectedDocuments[0].hasOwnProperty("name")) {
                    //             NodeDB.update({ "_id": this.id }, { $set: { name: this.name } }, { upsert: false })
                    //         }
                    //     }
                    // }.bind({ id: msg[0], name: msg[5] }))
                }
                if (_msg[4] == '12') { //Version - I_SKETCH_VERSION
                    _node.version = _msg[5]
                    // NodeDB.update({ "_id": msg[0] }, { $set: { version: msg[5] } }, { upsert: true })
                    //TODO if maxversion == undefined then set to *
                    // mqttCloud.publish('system/node/'+msg[0]+'/version', msg[5], {qos: 0, retain: false})
                }
                if (_msg[4] == '0') { //Battery - I_BATTERY_LEVEL
                    _node.battery = _msg[5]
                }
            }
            debug('Update Nodes.db: %s %o', _node.id, _node)
            db.Nodes.upsert(_node)
                .then(function () {
                })
                .catch((err) => {
                    console.log('%s', err)
                })
            // db.Nodes.update(_node, { where: { id: _node.id } })
            //     .then(rowsUpdated => _doInsertOnNewNode(rowsUpdated, _node))
            //     .catch((err) => {
            //         console.log('%s', err)
            //     })

            break
        default:
    }
}

function _doInsertOnNewMessage(rowsUpdated, values) {
    if (rowsUpdated == 0) {
        debug('Insert Messages.db: %o', values)
        db.Messages.create(values)
            .then(updatedRow => {
                // console.log(updatedRow.get({ plain: true }))
                // console.log('...inserted...')
            })
            .catch((err) => {
                console.log('%s', err)
            })
    }
}

// function _doInsertOnNewNode(rowsUpdated, values) {
//     if (rowsUpdated == 0) {
//         values.type = "OpenNode"
//         debug('Insert Nodes.db: %o', values)
//         db.Nodes.create(values)
//             .then(updatedRow => {
//                 console.log(updatedRow.get({ plain: true }))
//             })
//             .catch((err) => {
//                 console.log('%s', err)
//             })
//     }
// }

function _doInsertOnNewDevice(rowsUpdated, values) {
    if (rowsUpdated == 0) {
        // values.name = values.board
        debug('Insert Devices.db: %o', values)
        db.Devices.create(values)
            .then(updatedRow => {
                console.log(updatedRow.get({ plain: true }))
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



/*
//get node networkID
var _msg = _message.toString().split(';')
//internal-3, presentation-0, set-1, request-2, stream-4
switch (_msg[2]) {
    case '0': //presentation
        var NodeDevice = new Object()
        NodeDevice.id = parseInt(_msg[1])
        NodeDevice.type = parseInt(_msg[4])
        NodeDB.find({ $and: [{ "_id": _msg[0] }, { "devices": { $elemMatch: { id: parseInt(_msg[1]), type: parseInt(_msg[4]) } } }] }, {}, function (err, entries) {
            if (!err) {
                if (entries.length < 1) {
                    DeviceTypeDB.find({ "type": parseInt(_msg[4]) }, function (err, entries) {
                        var _deviceName = "Unknown"
                        if (!err && entries.lenght > 0) {
                            _deviceName = entries[0].name
                        }
                        NodeDB.update({ "_id": this._msg[0] }, { $push: { "devices": { id: parseInt(this._msg[1]), type: parseInt(this._msg[4]), name: _deviceName } } }, {}, function () {
                        })
                    }.bind({ _msg: _msg }))
                }
            }
        })
        break
    case '1': //set
        MessageDB.update({ $and: [{ "nodeid": msg[0] }, { "deviceid": parseInt(msg[1]) }, { "msgtype": parseInt(msg[4]) }] }, { $set: { "msgvalue": msg[5], "updated": Math.floor(Date.now() / 1000), "rssi": messageRSSI } }, { returnUpdatedDocs: true, multi: false }, function (err, wasAffected, affectedDocument) {
            if (!err) {
                if (!wasAffected) //The row wasn't updated : Create new entry
                {
                    //Do insert only if the node is registered
                    NodeDB.find({ $and: [{ "_id": msg[0], "devices.id": parseInt(msg[1]) }] }, function (err, entries) {
                        if (!err) {
                            if (entries.length == 1) {
                                var deviceIndex = entries[0].devices.map(function (device) { return device.id; }).indexOf(parseInt(msg[1]))
                                MessageDB.update({ $and: [{ "nodeid": msg[0], "deviceid": parseInt(msg[1]), "msgtype": parseInt(msg[4]) }] }, { "nodeid": msg[0], "deviceid": parseInt(msg[1]), "devicetype": entries[0].devices[deviceIndex].type, "msgtype": parseInt(msg[4]), "msgvalue": msg[5], "updated": Math.floor(Date.now() / 1000), "rssi": messageRSSI }, { upsert: true }, function (err, numAffected, affectedDocument, upsert) {
                                    callAction(affectedDocument)
                                    doMessageMapping(affectedDocument)
                                    doDeviceSubscribe(affectedDocument)
                                    doSaveHistory(affectedDocument)
                                })
                            }
                        }
                    })
                }
                else {
                    //Call automation
                    callAction(affectedDocument)
                    doMessageMapping(affectedDocument)
                    doDeviceSubscribe(affectedDocument)
                    doSaveHistory(affectedDocument)
                }
            }
        })
        break
    case '3':  //internal
        if (msg[1] == 255) //Internal contact
        {
            if (msg[4] == '29')  //Change - I_HAS_CHANGE
            {
                // console.log('* I_HAS_CHANGE')
                MessageDB.find({ $and: [{ "nodeid": msg[0] }, { changed: "Y" }] }, { _id: 1 }, function (err, entries) {
                    if (!err) {
                        if (entries.length > 0) {
                            sendMessageToNode(message, entries.length)
                            console.log('* I_HAS_CHANGE: %s', entries.length)
                            // MessageMappingDB.find({ $or: [{"_id" : { $in: findDevices } }, {"_id" : { $exists: (findDevices.length === 0) ? true : false } }] }, function (err, entries) {
                            // })
                            for (var m in entries) {
                                sendMessageToNode(entries[m]._id, entries[m].value)
                            }
                        }
                    }
                })
            }
            if (msg[4] == '11')  //Board - I_SKETCH_NAME
            {
                NodeDB.update({ "_id": msg[0] }, { $set: { type: nodetype, board: msg[5] } }, { upsert: true, returnUpdatedDocs: true }, function (err, numAffected, affectedDocuments) {
                    if (!err && numAffected) {
                        if (isEmptyObject(affectedDocuments[0])) {
                            NodeDB.update({ "_id": this.id }, { $set: { name: this.name } }, { upsert: false })
                        } else if (!affectedDocuments[0].hasOwnProperty("name")) {
                            NodeDB.update({ "_id": this.id }, { $set: { name: this.name } }, { upsert: false })
                        }
                    }
                }.bind({ id: msg[0], name: msg[5] }))
            }
            if (msg[4] == '12')  //Version - I_SKETCH_VERSION
            {
                NodeDB.update({ "_id": msg[0] }, { $set: { version: msg[5] } }, { upsert: true })
                //TODO if maxversion == undefined then set to *
                // mqttCloud.publish('system/node/'+msg[0]+'/version', msg[5], {qos: 0, retain: false})
            }
            if (msg[4] == '0')  //Battery - I_BATTERY_LEVEL
            {
                NodeDB.update({ "_id": msg[0] }, { $set: { battery: msg[5] } }, { upsert: true })
            }
        }
        break
    default:
}
*/