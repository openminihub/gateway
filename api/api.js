const db = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op
var debug = require('debug')('api')
const System = require('../system')


module.exports = {

    getDeviceValues: (msg, respond) => {
        db.DeviceValues.findAll({
            attributes: ['node_id', 'device_id', 'devicetype_id', 'name', 'place_id', 'messages'],
            where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters }
        })
            .then(
                result => {
                    // var response = result.get({ plain: true })
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                // console.log('%s', err)
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    listPlaces: (msg, respond) => {
        debug('listPlaces, empty?: %s', _isEmptyObject(msg.parameters))
        db.Places.findAll({
            attributes: ['id', 'parent_id', 'name'],
            where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters }
        })
            .then(
                result => {
                    // var response = result.get({ plain: true })
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                // console.log('%s', err)
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    createPlace: (msg, respond) => {
        db.Places.create(msg.parameters)
            .then(
                result => {
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    renamePlace: (msg, respond) => {
        db.Places.update(
            { name: msg.parameters.name },
            { where: { id: msg.parameters.id } }
        )
            .spread(
                (affectedCount, affectedRows) => {
                    if (affectedCount)
                        var response = { placeRenamed: [msg.parameters] }
                    else
                        var response = { placeRenamed: [] }
                    return respond(response, msg, affectedCount)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    removePlace: (msg, respond) => {
        db.Places.destroy(
            { where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters } }
        )
            .then(function (result) {
                if (result)
                    var response = { placesRemoved: [msg.parameters] }
                else
                    var response = { placesRemoved: [] }
                return respond(response, msg, result)
            })
            .catch((err) => {
                debug('-> ', err)
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    listDevices: (msg, respond) => {
        db.Devices.findAll({
            attributes: ['node_id', 'id', 'devicetype_id', 'name', 'place_id'],
            where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters }
            // where: _isEmptyObject(msg.parameters) === true ? { } : msg.parameters.includes('[Op.') === true ? msg.parameters : { [Op.or]: msg.parameters }
        })
            .then(
                result => {
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    renameDevice: (msg, respond) => {
        db.Devices.update(
            { name: msg.parameters.name },
            { where: { node_id: msg.parameters.node_id, id: msg.parameters.id } }
        )
            .spread(
                (affectedCount, affectedRows) => {
                    if (affectedCount)
                        var response = { deviceRenamed: [msg.parameters] }
                    else
                        var response = { deviceRenamed: [] }
                    return respond(response, msg, affectedCount)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    listNodes: (msg, respond) => {
        db.Nodes.findAll({
            attributes: ['id', 'version', 'board', 'type', 'name', 'ip', 'battery'],
            where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters }
        })
            .then(
                result => {
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    renameNode: (msg, respond) => {
        db.Nodes.update(
            { name: msg.parameters.name },
            { where: { id: msg.parameters.id } }
        )
            .spread(
                (affectedCount, affectedRows) => {
                    if (affectedCount)
                        var response = { nodeRenamed: [msg.parameters] }
                    else
                        var response = { nodeRenamed: [] }
                    return respond(response, msg, affectedCount)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    listMessageTypes: (msg, respond) => {
        db.MessageTypes.findAll({
            attributes: ['id', 'type', 'name', 'ro'],
            where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters }
        })
            .then(
                result => {
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    listDeviceTypes: (msg, respond) => {
        db.MessageTypes.findAll({
            attributes: ['id', 'type', 'name', 'messages'],
            where: _isEmptyObject(msg.parameters) === true ? {} : { [Op.or]: msg.parameters }
        })
            .then(
                result => {
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg, 1)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    attachDeviceToPlace: (msg, respond) => {
        db.Devices.update(
            { place_id: msg.parameters.place_id },
            { where: { [Op.and]: { node_id: msg.parameters.node_id, id: msg.parameters.device_id } } }
        )
            .spread(
                (affectedCount, affectedRows) => {
                    if (affectedCount)
                        var response = { deviceAttached: [msg.parameters] }
                    else
                        var response = { deviceAttached: [] }
                    return respond(response, msg, affectedCount)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    detachDeviceFromPlace: (msg, respond) => {
        db.Devices.update(
            { place_id: null },
            { where: { [Op.and]: { node_id: msg.parameters.node_id, id: msg.parameters.device_id } } }
        )
            .spread(
                (affectedCount, affectedRows) => {
                    if (affectedCount)
                        var response = { deviceDetached: [msg.parameters] }
                    else
                        var response = { deviceDetached: [] }
                    return respond(response, msg, affectedCount)
                })
            .catch((err) => {
                var response = { message: err.toString() }
                return respond(response, msg, 0)
            })
    },

    updateGateway: (msg, respond) => {
        debug('updateGateway')
        // return respond({"maize": "2"}, msg, 0)
        // return respond({maize: "2"}, msg, 0)
        // var response = System.updateGateway(msg)
        // return respond(response, msg, 0)
        return System.updateGateway(msg, respond)
    }

}

// function _isEmptyObject(obj) {
//     // return ((obj === undefined) || Object.keys(obj).length === 0 ? 1 : 0)
//     return (typeof obj === 'undefined' || Object.keys(obj).length === 0 ? 1 : 0)
// }

function _isEmptyObject(obj) {
    if (typeof obj === 'undefined') {
        return true
    }
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}