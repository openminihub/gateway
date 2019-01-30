const db = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op

exports = {
    getDeviceValues: (par, topic, respond) => {
        db.Devices.findAll({
            attributes: ['device', 'node_id', 'type', 'name', 'place_id'],
            include: [{
                model: db.Messages,
                where: { [Op.or]: par },
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
                    return respond(response, topic, 1)
                }
            )
    },

    listPlaces: (par, topic, respond) => {
        db.Places.findAll({
            attributes: ['id', 'parent_id', 'name']
        })
            .then(
                result => {
                    var response = result.get({ plain: true })
                    return respond(response, topic, 1)
                })
    },



    returnAPI: (answer, topic, result) => {
        console.log(result)
        console.log(topic)
        console.log(JSON.stringify(answer))
    }
}