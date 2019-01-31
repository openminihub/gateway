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
