const db = require('./models')
const api = require('./api') 
const Sequelize = require('sequelize');
const Op = Sequelize.Op
const SerialPort = require('./serialport')
const Mqtt = require('./mqtt')
var debug = require('debug')('gateway')
const Config = require('./config')


var my_config = Config.load()

SerialPort.enable(my_config.serial.port, my_config.serial.baudrate)
Mqtt.enable(my_config.mqtt)

// var _version = '1.2.2'
// var _user = 'user1'

// var node_list = [{ node_id: '5', device: '1' }, { node_id: '6', device: '1' }]

// console.log(Sequelize.config)

// api.getDeviceValues(node_list, _user, api.returnAPI)
// _user = 'user2'
// api.getDeviceValues(node_list, _user, api.returnAPI)
// _user = 'user3'

