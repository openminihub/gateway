const db = require('./models')
const api = require('./api') 
const Sequelize = require('sequelize');
const Op = Sequelize.Op
const SerialPort = require('./serialport')
const Mqtt = require('./mqtt')
const Config = require('./config')
const System = require('./system')
const SunCalc = require('./devices/suncalc')
const InfluxDB = require('./influxdb')
var debug = require('debug')('gateway')


var gwConfig = Config.load()
Config.formatConsoleOutput()

System.isStartupAfterUpdate()
SerialPort.enable(gwConfig.serial.port, gwConfig.serial.baudrate)
Mqtt.enable(gwConfig.mqtt)

SunCalc.getTimes(new Date(), gwConfig.position)

InfluxDB.enable()