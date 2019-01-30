const db = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op

module.exports = {
    getDeviceValues: (msg, topic, respond) => {
        db.Devices.findAll({
            attributes: ['device', 'node_id', 'type', 'name', 'place_id'],
            include: [{
                model: db.Messages,
                where: { [Op.or]: msg.parameters },
                attributes: ['type', 'value', 'rssi', 'updatedAt']
            }]
        })
            .then(
                result => {
                    var response = JSON.parse(JSON.stringify(result))
                    for (var i = response.length; i--;) {
                        if (i > 0) {
                            if (response[i].node_id == response[i - 1].node_id &&
                                response[i].device == response[i - 1].device) {
                                if (Array.isArray(response[i - 1].Message))
                                    response[i - 1].Message = response[i - 1].Message.concat(response[i].Message)
                                else
                                    response[i - 1].Message = [response[i - 1].Message, response[i].Message]
                                response.splice(i, 1)
                            }
                            else {
                                response[i].Message = [response[i].Message]
                            }
                        }
                    }
                    // console.log(JSON.stringify(response))
                    return respond(response, msg.source, topic, 1)
                }
            )
    },

    listPlaces: (msg, topic, respond) => {
        var x= Object()
        if (_isEmptyObject(_json_message.parameters)) {
            x = { [Op.and]: '1=1' }
        } else {
            x = { [Op.or]: msg.parameters }
        }

        db.Places.findAll({
            attributes: ['id', 'parent_id', 'name'],
            where: x,
        })
            .then(
                result => {
                    // var response = result.get({ plain: true })
                    var response = JSON.parse(JSON.stringify(result))
                    return respond(response, msg.source, topic, 1)
                })
            .catch((err) => {
                // console.log('%s', err)
                var response = { message: err.toString() }
                return respond(response, msg.source, topic, 0)
            })
    },

    createPlace: (msg, topic, respond) => {
        db.Places.create(msg.parameters)
            .then(
                result => {
                    var response = result.get({ plain: true })
                    return respond(response, msg.source, topic, 1)
                })
            .catch((err) => {
                // console.log('%s', err)
                var response = { message: err }
                return respond(response, msg.source, topic, 0)
            })
    },


    respondUser: (answer, source, topic, result) => {
        console.log(source)
        console.log(result)
        console.log(topic)
        console.log(JSON.stringify(answer))
    }
}

function _isEmptyObject(obj) {
    // return ((obj === undefined) || Object.keys(obj).length === 0 ? 1 : 0)
    return (typeof obj === 'undefined' || Object.keys(obj).length === 0 ? 1 : 0)
}