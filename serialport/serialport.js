var SerialPort = require('serialport')
const OpenNode = require('../devices/opennode.js')


exports.enable = function (seria_port, baud_rate) {

    var Serial = new SerialPort(seria_port, { baudRate: baud_rate, autoOpen: false }, function (error) {
        if (error) {
            return console.log('SerialPort Error: ', error.message)
        }
    })
    
    var Readline = SerialPort.parsers.Readline;
    var SerialParser = new Readline();
    Serial.pipe(SerialParser);

    Serial.on('error', function serialErrorHandler(error) {
        //Send serial error messages to console.
        console.error(error.message)
    })

    Serial.on('close', function serialCloseHandler(error) {
        console.error(error.message)
        process.exit(1)
    })

    SerialParser.on('data', function (data) { OpenNode.processSerialData(data) })

    Serial.open(function (error) {
        if (error) {
            return console.log('Error opening serial port: ', error.message);
        }
        else {
            console.log('Successfully opened serial port: %s', seria_port);
        }
    })

}