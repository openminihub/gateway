// **********************************************************************************
// Gateway for OpenMiniHub IoT Framework
// **********************************************************************************
// Copyright Martins Ierags, OpenMiniHub (2017)
// **********************************************************************************
var nconf = require('nconf')                                   //https://github.com/indexzero/nconf
var JSON5 = require('json5')                                   //https://github.com/aseemk/json5
var path = require('path')
var SerialPort = require('serialport')
var dbDir = 'data'
var fs = require("fs")
const execFile = require('child_process').execFile
var readFile = require('n-readlines')
nconf.argv().file({ file: path.resolve(__dirname, 'settings.json5'), format: JSON5 })
settings = nconf.get('settings')
const firmwareLocation = './firmware/';
var mqtt = require('mqtt')
var mqttCloud = mqtt.connect('mqtt://' + settings.mqtt.server.cloud.name.value + ':' + settings.mqtt.server.cloud.port.value, { username: settings.mqtt.server.cloud.username.value, password: settings.mqtt.server.cloud.password.value })
var mqttLocal = mqtt.connect('mqtt://' + settings.mqtt.server.local.name.value + ':' + settings.mqtt.server.local.port.value, { username: settings.mqtt.server.local.username.value, password: settings.mqtt.server.local.password.value })
var Datastore = require('nedb')
NodeDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.node.value), autoload: true })
BuildingDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.building.value), autoload: true })
MessageDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.message.value), autoload: true })
DeviceTypeDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.devicetype.value), autoload: true })
MessageTypeDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.messagetype.value), autoload: true })
ActionDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.action.value), autoload: true })
UserDB = new Datastore({ filename: path.join(__dirname, dbDir, settings.database.user.value), autoload: true })

var Influx = require('influx')

const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'openminihub',
  schema: [
    {
      measurement: 'message',
      tags: [
        'nodeid',
        'deviceid',
        'devicetype',
        'msgtype'
      ],
      fields: {
        msgvalue: Influx.FieldType.FLOAT,
        msgdata: Influx.FieldType.STRING
      }
    }
  ]
})

influx.getDatabaseNames()
  .then(names => {
    if (!names.includes('openminihub')) {
      influx.createDatabase('openminihub')
    }
  })
  .catch(err => {
    console.error(`Error creating Influx database!`)
  })

var log = console.log
console.log = function () {
  var first_parameter = arguments[0]
  var other_parameters = Array.prototype.slice.call(arguments, 1)

  function formatConsoleDate(date) {
    var hour = date.getHours()
    var minutes = date.getMinutes()
    var seconds = date.getSeconds()
    var milliseconds = date.getMilliseconds()
    return '[' +
      ((hour < 10) ? '0' + hour : hour) +
      ':' +
      ((minutes < 10) ? '0' + minutes : minutes) +
      ':' +
      ((seconds < 10) ? '0' + seconds : seconds) +
      '.' +
      ('00' + milliseconds).slice(-3) +
      '] '
  }
  log.apply(console, [formatConsoleDate(new Date()) + first_parameter.trim()].concat(other_parameters))
}

console.log('=========================================');
console.log('============ GAETWAY STARTUP ============');
console.log('=========================================');




//global variable for firmware upload
global.nodeTo = 0
//global variable for gateway system topic
global.systempTopic = 'system/gateway'

var serial = new SerialPort(settings.serial.port.value, { baudRate: settings.serial.baud.value, autoOpen: false }, function (error) {
  if (error) {
    return console.log('SerialPort Error: ', error.message);
  }
});
var Readline = SerialPort.parsers.Readline;
var serialParser = new Readline();
serial.pipe(serialParser);

serial.on('error', function serialErrorHandler(error) {
  //Send serial error messages to console.
  console.error(error.message)
})

serial.on('close', function serialCloseHandler(error) {
  console.error(error.message)
  process.exit(1)
})

serialParser.on('data', function (data) { processSerialData(data) })

serial.open(function (error) {
  if (error) {
    return console.log('Error opening serial port: ', error.message);
  }
  else {
    console.log('Successfully opened serial port: %s', settings.serial.port.value);
  }
});

NodeDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
BuildingDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
MessageDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs

global.processSerialData = function (data) {
  //  console.log('SERIAL: %s', data)
  handleOutTopic(data, 'OpenNode')
}

//MQTT
mqttCloud.on('connect', () => {
  //on startup subscribe to all node topics
  mqttCloud.subscribe('user/+/in')
  console.log('+connection to cloud mqtt OK')
})

mqttLocal.on('connect', () => {
  //on startup subscribe to all OpenNode topics
  NodeDB.find({ "type": "OpenNode" }, { _id: 1 }, function (err, entries) {
    if (!err) {
      if (entries.length > 1) {
        MessageDB.find({ nodeid: { $in: entries } }, function (err, entries) {
          if (!err) {
            console.log('==============================');
            console.log('* Subscribing to MQTT topics *');
            console.log('==============================');
            for (var n in entries) {
              var mqttTopic = 'node/' + entries[n].nodeid + '/' + entries[n].deviceid + '/' + entries[n].msgtype + '/set'
              mqttLocal.subscribe(mqttTopic)
              console.log('%s', mqttTopic);
            }
            console.log('==============================');
          }
          else {
            console.log('ERROR:%s', err)
          }
        })
      }
    }
  })
  //system configuration topics
  mqttLocal.subscribe('system/gateway')
  mqttLocal.subscribe('user/login')
  mqttLocal.subscribe('system/login')
  mqttLocal.subscribe('gateway/in')
  mqttLocal.subscribe('system/node/?/?/?/set')
  mqttLocal.subscribe('user/+/in')
  mqttLocal.subscribe('gateway/node/+/out')
  // ESPURNA Handlers
  mqttLocal.subscribe('espurna/+/+')
  mqttLocal.subscribe('espurna/+/+/+')
  console.log('+connection to local mqtt OK')
})

mqttCloud.on('message', (topic, message) => {
  if (message.toString().trim().length > 0) {
    console.log('MQTT < %s %s', topic, message.toString('utf8').replace(/\s+/g, ' ').trim())
    stopic = topic.split('/')
    switch (stopic[0]) {
      case 'user':
        return handleUserMessage(topic, message)
      // default:
    }
  }
  console.log('No handler for topic %s', topic)
})

mqttLocal.on('message', (topic, message) => {
  if (message.toString().trim().length > 0) {
    console.log('MQTT < %s %s', topic, message.toString('utf8').replace(/\s+/g, ' ').trim())
    stopic = topic.split('/')
    switch (stopic[0]) {
      case 'system':
        switch (stopic[1]) {
          case 'gateway':
            return handleGatewayMessage(topic, message)
          // case 'node':
          // return handleNodeMessage(topic, message)
          default:
            return false;
        }
      case 'user':
        return handleUserMessage(topic, message)
      case 'gateway':
        return handleGatewayMessage(topic, message)
      case 'node':
        return handleSendMessage(topic, message)
      case 'espurna':
        return handleOutTopic(topic + '/' + message, 'ESPurna')
      //      default:
    }
  }
  console.log('No handler for topic %s', topic)
})

function handleOutTopic(rxmessage, nodetype) {
  switch (nodetype) {
    case 'OpenNode':
      var message = rxmessage.toString().trim()
      var rssiIdx = rxmessage.indexOf('[RSSI:') //not found = -1
      var messageRSSI = ''
      if (rssiIdx > 0) {
        message = rxmessage.substr(0, rssiIdx).toString().trim();
        messageRSSI = parseInt(rxmessage.substr(rssiIdx + 6, rxmessage.length - 2 - (rssiIdx + 6)))
      }
      //if FLX?OK then update firmware for OpenNode
      if (message.toString().trim() == 'FLX?OK') {
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

      //Validate the Message structure: node-id ; device-id ; command ; ack ; msgtype ; payload
      var re = new RegExp("^[a-zA-Z0-9][;][0-9][;][0-9][;][0-1][;][0-9][;].*$");
      if (re.test(rxmessage))
        return false
      //regular message
      console.log('RX   > %s', rxmessage)

      //take off all not valid symbols
      var trim_msg = message.replace(/(\n|\r)+$/, '')
      //get node networkID
      var msg = trim_msg.toString().split(';')
      //internal-3, presentation-0, set-1, request-2, stream-4
      switch (msg[2]) {
        case '0': //presentation
          var NodeDevice = new Object()
          NodeDevice.id = parseInt(msg[1])
          NodeDevice.type = parseInt(msg[4])
          NodeDB.find({ $and: [{ "_id": msg[0] }, { "devices": { $elemMatch: { id: parseInt(msg[1]), type: parseInt(msg[4]) } } }] }, {}, function (err, entries) {
            if (!err) {
              if (entries.length < 1) {
                NodeDB.update({ "_id": msg[0] }, { $push: { "devices": { id: parseInt(msg[1]), type: parseInt(msg[4]) } } }, {}, function () {
                })
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
            if (msg[4] == '11')  //Name - I_SKETCH_NAME
            {
              NodeDB.update({ "_id": msg[0] }, { $set: { type: nodetype, name: msg[5], } }, { upsert: true })
              // mqttCloud.publish('system/node/'+msg[0]+'/name', msg[5], {qos: 0, retain: false})
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

    case 'ESPurna':
      //take off all not valid symbols
      var trim_msg = rxmessage.toString().trim().replace(/(\n|\r)+$/, '')
      // message = rxmessage.substr(0, rssiIdx).toString().trim();
      //get node networkID
      var msg = trim_msg.toString().split('/')
      if (msg.length == 4) //Internal message
      {
        switch (msg[2]) {
          case 'version':
            NodeDB.update({ "_id": msg[1] }, { $set: { version: msg[3] } }, { upsert: true })
            break
          case 'board':
            NodeDB.update({ "_id": msg[1] }, { $set: { board: msg[3] } }, { upsert: true })
            break
          case 'host': //name
            NodeDB.update({ "_id": msg[1] }, { $set: { type: nodetype, name: msg[3], } }, { upsert: true })
            break
          case 'vcc': //battery
            NodeDB.update({ "_id": msg[1] }, { $set: { battery: msg[3] } }, { upsert: true })
            break
          case 'ip': //ip
            NodeDB.update({ "_id": msg[1] }, { $set: { ip: msg[3] } }, { upsert: true })
            break
          case 'rssi': //rssi
            MessageDB.update({ "nodeid": msg[1] }, { $set: { "rssi": msg[3] * -1 }, { returnUpdatedDocs: false, multi: true }, function (err, wasAffected) {
            })
            break
        }
      }
      else if (msg.length == 5) //Device message
      {
        switch (msg[2]) {
          case 'relay':
            var _deviceType = 3
            var _msgType = 2
            break
          default:
            var _deviceType = 23
            var _msgType = 48
            break
        }
        // MessageDB.update({ $and: [{"nodeid" : msg[1]}, {"deviceid": parseInt(msg[3])}, {"msgtype": parseInt(msg[4])}] }, { $set: { "msgvalue": msg[4], "updated": Math.floor(Date.now()/1000), "rssi": messageRSSI } }, { returnUpdatedDocs : true , multi : false }, function (err, wasAffected, affectedDocument ) {
        // MessageDB.update({ $and: [{ "nodeid" : msg[1], "deviceid": parseInt(msg[3]), "msgtype": _msgType }] }, { "nodeid" : msg[1], "deviceid": parseInt(msg[3]), "devicetype": _deviceType, "msgtype": _msgType, "msgvalue": msg[4], "updated": Math.floor(Date.now()/1000), "rssi": 0 }, { upsert: true }, function (err, wasAffected, affectedDocument, upsert) {
        MessageDB.update({ $and: [{ "nodeid": msg[1], "deviceid": parseInt(msg[3]), "msgtype": _msgType }] }, { "nodeid": msg[1], "deviceid": parseInt(msg[3]), "devicetype": _deviceType, "msgtype": _msgType, "msgvalue": msg[4], "updated": Math.floor(Date.now() / 1000) }, { upsert: true, returnUpdatedDocs: true, multi: false }, function (err, wasAffected, affectedDocument, upsert) {
          callAction(affectedDocument)
          doMessageMapping(affectedDocument)
          doDeviceSubscribe(affectedDocument)
          doSaveHistory(affectedDocument)
        })
        NodeDB.find({ $and: [{ "_id": msg[1] }, { "devices": { $elemMatch: { id: parseInt(msg[3]), type: _deviceType } } }] }, {}, function (err, entries) {
          if (!err) {
            if (entries.length < 1) {
              NodeDB.update({ "_id": msg[1] }, { $push: { "devices": { id: parseInt(msg[3]), type: _deviceType } } }, {}, function () {
              })
            }
          }
        })
      }
      return true
  }
}

function handleGatewayMessage_OLD(topic, message) {
  // console.log('%s: %s', topic, message)
  var splitTopic = topic.toString().split('/')
  //get node list
  if (splitTopic[1] == 'gateway' && message.length > 0) {
    try {
      var msg = JSON.parse(message);
    }
    catch (e) {
      return console.error(e)
    }
    switch (msg.cmd) {
      case 'updateHRFHJsk':
        fs.open('./.updatenow', "wx", function (err, fd) {
          // handle error
          fs.close(fd, function (err) {
            // handle error
            if (err) {
              mqttCloud.publish('system/gateway', 'previous update in progress', { qos: 0, retain: false })
            }
            else {
              mqttCloud.publish('system/gateway', 'updating', { qos: 0, retain: false })
              const child = execFile('./gateway-update.sh', [''], (error, stdout, stderr) => {
                if (error) {
                  mqttCloud.publish('system/gateway', 'update error', { qos: 0, retain: false })
                }
                console.log(stdout);
              });
            }
          });
        });
        break
      default:
        console.log('No handler for %s %s', topic, message)
    }
  }
  //set gateway to include mode
  if (splitTopic[1] == 'gateway' && splitTopic[2] == 'include' && message == 'enable') {
    console.log('include mode')
    serial.write('*i' + '\n', function () { serial.drain(); })
  }
  //change gateway password
  if (splitTopic[1] == 'gateway' && splitTopic[2] == 'password' && message.length > 0) {
    serial.write('*p' + message + '\n', function () { serial.drain(); })
  }

  if (splitTopic[1] == 'login' && message.length > 0) {
    // console.log('login mode')
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      return console.error(e)
    }
    // console.log('MD5: %s', crypto.createHash('md5').update(msg.username).digest("hex"))
    var userMD5 = crypto.createHash('md5').update(msg.username).digest("hex")
    mqttCloud.publish('system/login/' + msg.username, '{"md5": "' + userMD5 + '"}', { qos: 0, retain: false })
    mqttCloud.subscribe(userMD5 + '/in')
  }
}

function handleGatewayMessage(topic, message) {
  var splitTopic = topic.toString().split('/')
  if (splitTopic[1] == 'node' && splitTopic[3] == 'out' && message.length > 0) {
    // console.log('mqtt->mysensors')
    handleOutTopic(splitTopic[2] + ';' + message, 'ESP')
  }
}


function handleUserMessage(topic, message) {
  var splitTopic = topic.toString().split('/')
  if (splitTopic[2] == 'in' && message.length > 0) {
    var userTopic = 'user/' + splitTopic[1] + '/out'
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      var payload = []
      var result = 0
      payload.push({ message: "Error parsing JSON" });
      var newJSON = '{"result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      return console.error(e)
    }
    switch (msg.cmd) {
      case 'updateGateway':
        updateGateway(userTopic, msg.id, msg.parameters)
        break
      case 'getUpdateInfo':
        getUpdateInfo(userTopic, msg.id, msg.parameters)
        break
      case 'controlGateway':
        controlGateway(userTopic, msg.id, msg.parameters)
        break
      case 'deleteAllBuildings':
        deleteAllBuildings(userTopic, msg.id, msg.parameters)
        break
      case 'createPlace':
        createPlace(userTopic, msg.id, msg.parameters)
        break
      case 'listPlaces':
        listPlaces(userTopic, msg.id, msg.parameters)
        break
      case 'removePlace':
        removePlace(userTopic, msg.id, msg.parameters)
        break
      case 'renamePlace':
        renamePlace(userTopic, msg.id, msg.parameters)
        break
      case 'attachDeviceToPlace':
        attachDeviceToPlace(userTopic, msg.id, msg.parameters)
        break
      case 'detachDeviceFromPlace':
        detachDeviceFromPlace(userTopic, msg.id, msg.parameters)
        break
      case 'listDevices':
        listDevices(userTopic, msg.id, msg.parameters)
        break
      case 'setDeviceValue':
        setDeviceValue(userTopic, msg.id, msg.parameters)
        break
      case 'getDeviceValues':
        getDeviceValues(userTopic, msg.id, msg.parameters)
        break
      case 'getDeviceValueHistory':
        getDeviceValueHistory(userTopic, msg.id, msg.parameters)
        break
      case 'listDeviceTypes':
        listDeviceTypes(userTopic, msg.id, msg.parameters)
        break
      case 'listMessageTypes':
        listMessageTypes(userTopic, msg.id, msg.parameters)
        break
      case 'createMessageMapping':
        createMessageMapping(userTopic, msg.id, msg.parameters)
        break
      case 'subscribeForDeviceMessages':
        subscribeForDeviceMessages(userTopic, msg.id, msg.parameters)
        break
      case 'listSubscribedDevices':
        listSubscribedDevices(userTopic, msg.id, msg.parameters)
        break
      case 'listNodes':
        listNodes(userTopic, msg.id, msg.parameters)
        break
      case 'getNodeUpdateVersion':
        getNodeUpdateVersion(userTopic, msg.id, msg.parameters)
        break
      case 'updateNode':
        updateNode(userTopic, msg.id, msg.parameters)
        break
      default:
        console.log('No handler for %s %s', topic, message)
    }
  }

  if (splitTopic[1] == 'login' && message.length > 0) {
    // console.log('login mode')
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      return console.error(e)
    }
    var userMD5 = crypto.createHash('md5').update(msg.username).digest("hex")
    mqttCloud.publish('user/login/' + msg.username, '{"md5": "' + userMD5 + '"}', { qos: 0, retain: false })
    mqttCloud.subscribe('user/' + userMD5 + '/in')
  }
}

function handleSendMessage(topic, message) {
  // var trim_msg = topic.replace(/(\n|\r)+$/, '')
  var tpc = topic.toString().split('/')
  MessageDB.find({ $and: [{ "nodeid": tpc[1] }, { "deviceid": tpc[2] }, { "msgtype": tpc[3] }] }, function (err, entries) {
    if (!err) {
      if (entries.length > 0) {
        var txOpenNode = entries[0].nodeid + ';' + entries[0].deviceid + ';1;1;' + entries[0].msgtype + ';' + this.message + '\n'
        console.log('TX   > %s', txOpenNode)
        // serial.write(txOpenNode, function () { serial.drain(); });
      }
    }
  }.bind({ message }))
}

function nodeOTA(nodeid) {
  serial.write('TO:' + nodeid + '\n', function () { serial.drain(); });
}

function readNextFileLine(hexFile, lineNumber) {

  var fileLine;
  if (fileLine = hexFile.next()) {
    if (fileLine.toString('ascii').trim() == ":00000001FF") {
      global.nodeTo = 0
      console.log('Firmware successfully transfered')
      serial.write('FLX?EOF' + '\n', function () { serial.drain() })
    }
    else {
      serial.write('FLX:' + lineNumber + fileLine.toString('ascii').trim() + '\n', function () { serial.drain() })
    }
  }
}

function getNodeUpdateVersion(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.nodeid == undefined) {
    payload.push({ message: "No parameter specified" });
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  }
  else {
    NodeDB.find({ _id: par.nodeid }, function (err, entries) {
      if (entries.length == 1) {
        getAvailableFirmwareVersion(entries[0], function (newVersion) {
          if (versionCompare(newVersion, this.node.version)) {
            payload.push({ version: newVersion })
          }
          else {
            payload.push({ version: "0" })
          }
          result = 1
          var newJSON = '{"id":"' + this.id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
          mqttCloud.publish(this.userTopic, newJSON, { qos: 0, retain: false })
        }.bind({ node: entries[0], userTopic, id }))
      }
      else {
        payload.push({ message: "Node do not exists" });
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      }
    })
  }
}

function updateNode(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.nodeid == undefined) {
    payload.push({ message: "No parameter specified" })
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  }
  else {
    NodeDB.find({ _id: par.nodeid }, function (err, entries) {
      if (entries.length == 1) {
        if (entries[0].battery == undefined)
          serial.write('TO:' + par.nodeid + '\n', function () { serial.drain() })
        else
          serial.write('*u' + par.nodeid + '\n', function () { serial.drain() })
        payload.push({ message: "Node update initiated" })
        result = 1
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      }
      else {
        payload.push({ message: "Node do not exists" });
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      }
    })
  }
}

function getAvailableFirmwareVersion(node, callback) {
  const { exec } = require('child_process')
  exec("ls " + firmwareLocation + node.type + "/" + node.name + "/" + node.name + "_* | sort -r | head -1 | awk -F'_' '{print $2}'|cut -d'.' -f1,2", (err, stdout, stderr) => {
    if (!err) {
      if (stdout.length > 0)
        return callback(stdout.trim())
    }
    return callback('0')
  })
}

function getAvailableFirmware(node, callback) {
  const { exec } = require('child_process')
  exec("ls " + firmwareLocation + node.type + "/" + node.name + "/" + node.name + "_* | sort -r | head -1", (err, stdout, stderr) => {
    if (!err) {
      if (stdout.length > 0)
        return callback(stdout.trim())
    }
    return callback('0')
  })
}

// Returns true if v1 is bigger than v2, and false if otherwise.
function versionCompare(v1, v2) {
  v1 = v1.split('.');
  v2 = v2.split('.');
  for (var i = 0; i < Math.max(v1.length, v2.length); i++) {
    if (v1[i] == undefined) return false; // If there is no digit, v2 is automatically bigger
    if (v2[i] == undefined) return true; // if there is no digit, v1 is automatically bigger
    if (v1[i] > v2[i]) return true;
    if (v1[i] < v2[i]) return false;
  }
  return false; // Returns false if they are equal
}

//API
function deleteAllBuildings(userTopic, id, par) {
  BuildingDB.remove({}, { multi: true }, function (err, numRemoved) {
    if (numRemoved > 0) {
      var newJSON = '{"id": "' + id + '", "payload": "true"}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      return
    }
    else {
      var newJSON = '{"id": "' + id + '", "payload": "false"}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      return
    }
  })
}

function setDeviceValue(userTopic, id, par) {
  // console.log('par: %s', JSON.stringify(par))
  var query = new Object()
  if (isEmptyObject(par)) {
    par = new Object()
  }
  var payload = []
  if (typeof par.nodeid === 'undefined' ||
    typeof par.deviceid === 'undefined' ||
    typeof par.msgtype === 'undefined' ||
    typeof par.msgvalue === 'undefined' ||
    typeof par.msgdata === 'undefined') {
    payload.push({ message: "Not all parameters are passed" })
    var result = 0
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    return false
  }
  else {
    NodeDB.find({ $and: [{ "_id": par.nodeid }, { "devices": { $elemMatch: { id: par.deviceid } } }] }, {}, function (err, entries) {
      var result = 0
      if (!err) {
        if (entries.length == 1) {
          var message = (this.par.msgvalue === null) ? this.par.msgdata : this.par.msgvalue.toString()
          switch (entries[0].type) {
            case 'OpenNode':
              var txOpenNode = this.par.nodeid + ';' + this.par.deviceid + ';1;1;' + this.par.msgtype + ';' + message + '\n'
              console.log('TX   > %s', txOpenNode)
              serial.write(txOpenNode, function () { serial.drain(); });
              payload.push({ message: "Message sent" });
              result = 1
              break
            case 'ESPurna':
              var deviceIndex = entries[0].devices.map(function (device) { return device.id; }).indexOf(this.par.deviceid)
              switch (entries[0].devices[deviceIndex].type) {
                case 3:
                  var _device = 'relay'
                  break
              }
              mqttLocal.publish('espurna/' + this.par.nodeid + '/' + _device + '/' + this.par.deviceid + '/set', message, { qos: 0, retain: false })
              break
          }
        }
      }
      if (!result) payload.push({ message: "Node not found!" });
      var newJSON = '{"id":"' + this.id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(this.userTopic, newJSON, { qos: 0, retain: false })
    }.bind({ par, userTopic, id }))
  }
}

function getDeviceValues(userTopic, id, par) {
  // console.log('par: %s', JSON.stringify(par))
  var query = new Object()
  if (isEmptyObject(par)) {
    par = new Object()
  }
  // console.log('query: %s', JSON.stringify(query))
  for (var d in par) {
    var payload = []
    var result = 1
    query = (par.lenght === 0) ? { "_id": { $exists: true } } : { $and: [{ "nodeid": par[d].nodeid }, { "deviceid": par[d].deviceid }] }
    MessageDB.find(query, function (err, entries) {
      if (!err && entries) {
        var messages = new Array()
        for (var n in entries) {
          var msgdata = entries[n].msgvalue
          var msgvalue = parseFloat(msgdata)
          if (msgvalue == NaN) {
            msgvalue = null
          }
          else {
            msgdata = null
          }
          messages.push({
            msgtype: entries[n].msgtype,
            msgvalue: msgvalue,
            msgdata: msgdata,
            updated: entries[n].updated,
            rssi: entries[n].rssi,
            id: entries[n]._id
          });
        }
        payload.push({
          nodeid: entries[n].nodeid,
          deviceid: entries[n].deviceid,
          devicetype: entries[n].devicetype,
          messages: messages
        });
        if (this.devicesLeft == 0) {
          var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
          mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
        }
      }
      else {
        result = 0
        payload.push({ message: "No device value" });
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      }
    }.bind({ devicesLeft: par.length - d - 1 }))
  }
}

function getDeviceValueHistory(userTopic, id, par) {
  // console.log('par: %s', JSON.stringify(par))
  var query = new Object()
  if (isEmptyObject(par)) {
    par = new Object()
  }
  var payload = []
  var result = 1
  if (typeof par.nodeid === 'undefined' ||
    typeof par.deviceid === 'undefined' ||
    typeof par.msgtype === 'undefined' ||
    typeof par.offsetfrom === 'undefined' ||
    typeof par.offsetto === 'undefined') {
    payload.push({ message: "Not all parameters are passed" });
    result = 0
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  }
  else {
    var historyQuery = ""
    if (typeof par.resolution === 'undefined') {
      historyQuery = "select msgvalue from message where nodeid = '" + par.nodeid + "'and deviceid = '" + par.deviceid + "'and msgtype = '" + par.msgtype + "'and time > now()-" + par.offsetfrom + " and time < now()-" + par.offsetto + " order by time asc"
    }
    else {
      historyQuery = "select round(mean(msgvalue)*10)/10 as msgvalue from message where nodeid = '" + par.nodeid + "'and deviceid = '" + par.deviceid + "'and msgtype = '" + par.msgtype + "'and time > now()-" + par.offsetfrom + " and time < now()-" + par.offsetto + " group by time(" + par.resolution + ") fill(none) order by time asc"
    }
    influx.query(historyQuery)
      .then(query_result => {
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(query_result) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      }).catch(err => {
        result = 0
        payload.push({ message: err.stack })
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      })
  }
}

function listNodes(userTopic, id, par) {
  NodeDB.find({ "_id": { $exists: true } }, function (err, entries) {
    if (!err) {
      if (entries.length > 0) {
        payload = []
        var result = 1
        for (var n in entries) {
          payload.push({
            type: entries[n].type,
            name: entries[n].name,
            version: entries[n].version,
            devices: entries[n].devices,
            id: entries[n]._id,
            battery: (entries[n].battery === undefined) ? null : entries[n].battery
          });
        }
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      }
    }
  })
}

function createPlace(userTopic, id, par) {
  var dbPlace = new Object()
  dbPlace.name = par.name
  // dbPlace.parentPlace = 
  dbPlace.parentid = (par.parentid === undefined) ? "" : par.parentid;
  dbPlace.devices = new Array()

  var payload = []
  var result = 0
  BuildingDB.insert(dbPlace, function (err, newEntry) {
    if (!err) {
      payload.push({ id: newEntry._id });
      result = 1
    }
    else {
      payload.push({ message: "Problem creating new place" });
    }
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  })
}

function listPlaces(userTopic, id, par) {
  var findPlaces = [""]
  if (par != undefined) {
    findPlaces = (par.parentid === undefined) ? findPlaces : par.parentid
  }
  // BuildingDB.find({ $or: [{parent : { $in: findPlaces} }, {parent : { $exists: (findPlaces.length === 0) ? true : false } }] }, function (err, entries) {
  BuildingDB.find({ parentid: { $in: findPlaces } }, function (err, entries) {
    var payload = []
    var result = 0
    if (!err) {
      if (entries.length > 0) {
        for (var i = 0; i < entries.length; i++) {
          payload.push({ name: entries[i].name, parentid: entries[i].parentid, devices: entries[i].devices, id: entries[i]._id });
          result = 1
        }
      }
      else {
        // payload.push({message: "No result for specified search criteria"});
        result = 1
      }
    }
    // else
    // {
    // payload.push({message: "Error listing places"});
    // }
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  })
}

function removePlace(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.id == undefined) {
    payload.push({ message: "No parameter specified" });
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  }
  else {
    BuildingDB.remove({ _id: { $in: par.id } }, { multi: true }, function (err, numRemoved) {
      if (numRemoved > 0) {
        payload.push({ message: "Place deleted" });
        result = 1
      }
      else {
        payload.push({ message: "Error removing place" });
      }
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    })
  }
}

function renamePlace(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.id == undefined) {
    payload.push({ message: "No parameter specified" });
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  }
  else {
    BuildingDB.update({ _id: par.id }, { $set: { "name": par.name } }, function (err, numAffected) {
      if (numAffected > 0) {
        payload.push({ message: "Place renamed" });
        result = 1
      }
      else {
        payload.push({ message: "Error renaming place" });
      }
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    })
  }
}

function attachDeviceToPlace(userTopic, id, par) {
  NodeDB.find({ $and: [{ "_id": par.nodeid, "devices.id": par.deviceid }] }, function (err, entries) {
    if (!err) {
      if (entries.length == 1) {
        var deviceIndex = (entries[0].devices.map(function (device) { return device.id; }).indexOf(parseInt(par.deviceid))).toString()
        NodeDB.update({ $and: [{ "_id": par.nodeid }, { "devices.id": par.deviceid }] }, { $set: { ['devices.' + deviceIndex + '.placeid']: par.placeid } }, {}, function (err, numAffected) {
          var payload = []
          var result = 0
          if (!err && numAffected > 0) {
            payload.push({ message: "Device attached" });
            result = 1
          }
          else {
            payload.push({ message: "Error attaching device to place" });
          }
          var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
          mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
        })
      }
    }
  })
}

function detachDeviceFromPlace(userTopic, id, par) {
  NodeDB.find({ $and: [{ "_id": par.nodeid, "devices.id": par.deviceid }] }, function (err, entries) {
    if (!err) {
      if (entries.length == 1) {
        var deviceIndex = (entries[0].devices.map(function (device) { return device.id; }).indexOf(parseInt(par.deviceid))).toString()
        NodeDB.update({ $and: [{ "_id": par.nodeid }, { "devices.id": par.deviceid }] }, { $unset: { ['devices.' + deviceIndex + '.placeid']: true } }, {}, function (err, numAffected) {
          var payload = []
          var result = 0
          if (!err && numAffected > 0) {
            payload.push({ message: "Device detached" });
            result = 1
          }
          else {
            payload.push({ message: "Error detaching device from place" });
          }
          var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
          mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
        })
      }
    }
  })
}

function mqttPublish(topic, message, options, server) {
  if (server == 'cloud')
    mqttCloud.publish(topic, message, options)
  else
    mqttLocal.publish(topic, message, options)
}

// function mqttCient.subscribe(topic) {
//   mqttCloud.subscribe(topic)
//   mqttLocal.subscribe(topic)
// }

function listDevices(userTopic, id, par) {
  var query = new Object()
  if (isEmptyObject(par)) {
    query = { "devices": { $exists: true } }
    listDeviceCondition = "1 == 1"
  }
  else {
    listDeviceCondition = ""
    query.$and = new Array()
    if (!isEmptyObject(par.devicetype)) {
      query.$and.push({ "devices.type": { $in: par.devicetype } })
      andCondition = (listDeviceCondition.length === 0) ? "" : " && "
      listDeviceCondition = listDeviceCondition + andCondition + "par.devicetype.includes(device.type)"
    }
    if (!isEmptyObject(par.placeid)) {
      if (par.placeid[0] == null) { //List devices not assigned to places
        query.$and.push({ "devices.placeid": { $exists: false } })
        andCondition = (listDeviceCondition.length === 0) ? "" : " && "
        listDeviceCondition = listDeviceCondition + andCondition + "par.placeid == undefined"
      }
      else if (par.placeid[0] == 'all') { //List all devices assigned to places
        query.$and.push({ "devices.placeid": { $exists: true } })
        andCondition = (listDeviceCondition.length === 0) ? "" : " && "
        listDeviceCondition = listDeviceCondition + andCondition + "par.placeid !== undefined"
      }
      else { //List devices assigned to requested places
        query.$and.push({ "devices.placeid": { $in: par.placeid } })
        andCondition = (listDeviceCondition.length === 0) ? "" : " && "
        listDeviceCondition = listDeviceCondition + andCondition + "par.placeid.includes(device.placeid)"
      }
    }
    listDeviceCondition = (listDeviceCondition.length === 0) ? "1 == 1" : listDeviceCondition
  }
  // console.log('query: %s', JSON.stringify(query))
  // console.log('condition: %s', listDeviceCondition)
  NodeDB.find(query, function (err, entries) {
    // console.log('error: %s', err)
    // console.log('cnt: %s', entries.length)
    var payload = []
    var result = 0
    if (entries.length > 0) {
      for (var i = 0; i < entries.length; i++) {
        for (var d in entries[i].devices) {
          device = entries[i].devices[d]
          device.nodeid = entries[i]._id
          if (eval(listDeviceCondition)) {
            payload.push(device)
          }
        }
      }
      result = 1
    }
    else {
      result = 1
      // payload.push({message: "No result for specified search criteria"});
    }
    // console.log('pld: %s', JSON.stringify(payload))
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  })
}

function listDeviceTypes(userTopic, id, par) {
  var listDeviceTypes = []
  if (par != undefined) {
    listDeviceTypes = (isEmptyObject(par.types)) ? listDeviceTypes : par.types
  }
  DeviceTypeDB.find({ $or: [{ type: { $in: listDeviceTypes } }, { type: { $exists: (listDeviceTypes.length === 0) ? true : false } }] }, function (err, entries) {
    var payload = []
    var result = 0
    if (entries.length > 0) {
      for (var i = 0; i < entries.length; i++) {
        payload.push({ name: entries[i].name, value: entries[i].value, type: entries[i].type });
      }
      result = 1
    }
    else {
      result = 1
      // payload.push({message: "No result for specified search criteria"});
    }
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  })
}

function listMessageTypes(userTopic, id, par) {
  var findMessageTypes = []
  if (par != undefined) {
    findMessageTypes = (par.msgtype === undefined) ? findMessageTypes : par.msgtype
  }
  MessageTypeDB.find({ $or: [{ type: { $in: findMessageTypes } }, { type: { $exists: (findMessageTypes.length === 0) ? true : false } }] }, function (err, entries) {
    var payload = []
    var result = 0
    if (entries.length > 0) {
      for (var i = 0; i < entries.length; i++) {
        payload.push({ name: entries[i].name, value: entries[i].value, type: entries[i].type });
      }
      result = 1
    }
    else {
      result = 1
      // payload.push({message: "No result for specified search criteria"});
    }
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  })
}

function callAction(message) {
  // {"_id":"1","name":"Automation 1","enabled":"1","hide":"0","triggers":[{"type":"state","attribute":"above","entity":"mFUIV160p9KFLr0P","value":"21.0","before":"OFF"}],"conditions":[{"type":"","entity":"","value":""}],"actions":[{"type":"object","attribute":"TURN","entity":"wkor2Xf3h3GQ7vnj","data":"ON"}]}
  ActionDB.find({ "trigger.entity": message._id }, function (err, entries) {
    if (!err && entries.length > 0) {
      // console.log('INFO : Action: %s', JSON.stringify(entries[0]))
      switch (entries[0].trigger.type) {
        case 'state':
          var aso = new actionStateOperator(entries[0].trigger.attribute)
          // console.log('INFO : Trigger result: %s', aso.evaluate(message.value, entries[0].trigger.value))
          if (aso.evaluate(message.value, entries[0].trigger.value)) {
            if ((entries[0].conditions).length > 0) {
              console.log('There are conditions')
              var conditionResult = true
              for (var c in entries[0].conditions) {
                switch (entries[0].conditions[c].type) {
                  case 'state':
                    MessageDB.find({ "_id": entries[0].conditions[c].entity }, function (err, entries) {
                      if (!err && entries.length > 0) {
                        aso.operation = this.condition.attribute
                        // console.log('INFO : msg value: %s', entries[0].value)
                        // console.log('INFO : cnd value: %s', this.condition.value)
                        conditionResult = conditionResult && aso.evaluate(entries[0].value, this.condition.value) ? true : false
                        // console.log('conditionResult: %s', conditionResult)
                        // console.log('aso.evaluate: %s', aso.evaluate(entries[0].value, this.condition.value))
                        if (conditionResult && this.conditionsLeft == 0) {
                          console.log('INFO : ACTION: %s', JSON.stringify(this.actions))
                        }
                      }
                    }.bind({ condition: entries[0].conditions[c], actions: entries[0].actions, message, conditionsLeft: entries[0].conditions.length - c - 1 }))
                    break
                }
              }
            }
            else {
              console.log('INFO : Action: %s', JSON.stringify(entries[0].actions))
              // var mqttTopic = 'node/'+message.node+'/'+message.contact+'/'+message.message+'/set'
              // mqttLocal.publish(mqttTopic, entries[0].actions[0].data, {qos: 0, retain: false})
              // sendMessageToNode(entries[0].actions[0].entity, entries[0].actions[0].data)
            }
          }
          break
        // default:
        // return handleSendMessage(topic, message)
      }
    }
    //    else
    //    {
    //      console.log('error: %s', err)
    //    }
  })
}

function doMessageMapping(message) {
  for (var m in message.mapping) {
    MessageDB.update({ "_id": message.mapping[m] }, { $set: { value: message.value, updated: message.updated, changed: "Y" } }, { returnUpdatedDocs: true, multi: false }, function (err, updated, entry) {
      if (!err) {
        if (updated) {
          console.log('* Message mapping done')
        }
      }
    })
  }
}

function doDeviceSubscribe(message) {
  UserDB.find({ messages: message._id }, function (err, entries) {
    for (var u in entries) {
      console.log('* %s has subscription', entries[u].user)
      var payload = []
      var msgvalue = parseFloat(this.message.msgvalue)
      if (msgvalue == NaN) {
        var msgdata = this.message.msgvalue
        msgvalue = undefined
      }
      else {
        var msgdata = null
      }
      payload.push({
        nodeid: this.message.nodeid,
        deviceid: this.message.deviceid,
        msgtype: this.message.msgtype,
        msgvalue: msgvalue,
        msgdata: msgdata,
        updated: this.message.updated,
        rssi: this.message.rssi
        // id: this.message._id});
      })
      var result = 1
      var newJSON = '{"id":"' + -1 + '", "cmd":"deviceMessageUpdate", "result":' + result + ', "payload":' + JSON.stringify(payload) + '}'
      mqttCloud.publish('user/' + entries[u].user + '/out', newJSON, { qos: 0, retain: false })
    }
  }.bind({ message }))
}

function doSaveHistory(message) {
  var msgvalue = parseFloat(message.msgvalue)
  if (msgvalue == NaN) {
    var msgdata = message.msgvalue
    msgvalue = undefined
  }
  else {
    var msgdata = undefined
  }
  influx.writePoints([
    {
      measurement: 'message',
      tags: { nodeid: message.nodeid, deviceid: message.deviceid, devicetype: message.devicetype, msgtype: message.msgtype },
      fields: {
        msgvalue: msgvalue,
        msgdata: msgdata
      }
    }
  ]).catch(error => {
    console.error(`Error saving data to InfluxDB: ${error.message}`)
  })
}

function actionStateOperator(op) { //your object containing your operator
  this.operation = op;

  this.evaluate = function evaluate(param1, param2) {
    switch (this.operation) {
      case "above":
        return parseFloat(param1) > parseFloat(param2)
      case "below":
        return parseFloat(param1) < parseFloat(param2)
      case "equal":
        return (param1 === param2) ? true : false
      case "notequal":
        return (param1 === param2) ? false : true
    }
  }
}

function sendMessageToNode(message, data) {
  // console.log('index: %s', message.indexOf(';'))
  if (message.indexOf(';') > 0) {
    var txOpenNode = message.replace(/(\n|\r)+$/, '') + data + '\n'
    console.log('TX > %s', txOpenNode.trim())
    serial.write(txOpenNode, function () { serial.drain(); });
  }
  else {
    MessageDB.find({ "_id": message }, function (err, entries) {
      if (!err) {
        if (entries.length > 0) {
          console.log('message: %s', JSON.stringify(entries[0]))
          NodeDB.find({ _id: entries[0].nodeid }, function (err, entries) {
            if (!err) {
              if (entries.length > 0) {
                switch (entries[0].type) {
                  case 'OpenNode':
                    var txOpenNode = this.dbMessage.node + ';' + this.dbMessage.contact + ';1;1;' + this.dbMessage.message + ';' + this.dbMessage.value + '\n' //+this.data+'\n'
                    console.log('TX > %s', txOpenNode.trim())
                    serial.write(txOpenNode, function () { serial.drain(); });
                    break
                  case 'ESP':
                    var mqttTopic = 'gateway/node/' + this.dbMessage.node + '/in'
                    var mqttMessage = this.dbMessage.contact + ';1;1;' + this.dbMessage.message + ';' + this.data
                    console.log('MQTT > %s %s', mqttTopic, mqttMessage)
                    mqttLocal.publish(mqttTopic, mqttMessage, { qos: 0, retain: false })
                    break
                  // default:
                }
              }
            }
            // var txOpenNode = entries[0].node+';'+entries[0].contact+';1;1;'+entries[0].message+';'+this.data+'\n'
            // console.log('TX > %s', txOpenNode.trim())
            // serial.write(txOpenNode, function () { serial.drain(); });
          }.bind({ dbMessage: entries[0], data }))
        }
      }
    }.bind({ data }))
  }
}

function createMessageMapping(userTopic, id, par) {
  MessageDB.update({ "_id": par.source }, { $addToSet: { "mapping": par.destination } }, { returnUpdatedDocs: true, multi: false }, function (err, wasUpdated, updatedDocument) {
    var payload = []
    var result = 0
    if (!err) {
      if (wasUpdated) {
        payload.push({ message: "Mapping done" });
        result = 1
      }
    }
    if (!result) {
      payload.push({ message: "Error mapping device" });
    }
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  })
}

function subscribeForDeviceMessages(userTopic, id, par) {
  var splitTopic = userTopic.toString().split('/')
  MessageDB.find({ $and: [{ "nodeid": par.nodeid }, { "deviceid": par.deviceid }] }, function (err, entries) {
    var payload = []
    var result = 0
    var deviceMessages = new Array()
    var query = new Object()
    for (var d in entries) {
      deviceMessages.push(entries[d]._id)
      if (d == entries.length - 1) {
        query = (par.disable === true) ? { $pull: { "messages": { $in: deviceMessages } } } : { $addToSet: { "messages": { $each: deviceMessages } } }
        // console.log("%s", JSON.stringify(query))
        UserDB.update({ "user": this.user }, query, { upsert: true }, function (err, wasUpdated) {
        })
      }
    }
    payload.push({ message: "Subscribing done" })
    result = 1
    var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
    mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
  }.bind({ user: splitTopic[1] }))
}

function listSubscribedDevices(userTopic, id, par) {
  var splitTopic = userTopic.toString().split('/')
  UserDB.find({ "user": splitTopic[1] }, function (err, entries) {
    if (!err && entries.length) {
      MessageDB.find({ "_id": { $in: entries[0].messages } }, { nodeid: 1, deviceid: 1, _id: 0 }, function (err, entries) {
        // MessageDB.find({ "_id": { $in: entries[0].messages} }, { nodeid: 1, deviceid: 1, _id: 0 }).sort({ nodeid: 1, deviceid: 1 }).exec(function (err, entries) {
        var payload = []
        var result = 0
        for (var n in entries) {
          if (!payload.find(o => o.nodeid === entries[n].nodeid && o.deviceid === entries[n].deviceid)) {
            payload.push({
              nodeid: entries[n].nodeid,
              deviceid: entries[n].deviceid
            })
          }
          result = 1
        }
        // console.log('%s', JSON.stringify(payload))
        var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
      })
    }
    else {
      var payload = []
      var result = 1
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    }
  })
}

function updateGateway(userTopic, id, par) {
  var payload = []
  var result = 0
  fs.readFile('./.updatenow', function (err, data) {
    //TO DO: handle old file
    if (!err) {
      payload.push({ message: "Previous update in progress" })
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    }
    else {
      fs.writeFile('./.updatenow', userTopic + '\n' + id + '\n', function (err) {
        if (!err) {
          const child = execFile('./gateway-update.sh', [''], (err, stdout, stderr) => {
            if (!err) {
              result = 1
              payload.push({ message: "Starting gateway update..." })
              var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
              mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
            }
            else {
              fs.unlink('./.updatenow', function (err) {
                if (err) console.log('Error deleting GW update lockfile!')
              });
              payload.push({ message: "Problem executing gateway update" })
              var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
              mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
            }
            console.log(stdout);
          })
        }
      })
    }
  })
}

function isStartupAfterUpdate() {
  fs.readFile('./.updatedone', 'utf8', function read(err, data) {
    if (!err) {
      var filecontent = data
      lines = filecontent.split('\n')
      if (lines.length > 2) {
        var payload = []
        var result = 1
        payload.push({ message: lines[2] })
        var newJSON = '{"id":"' + lines[1] + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
        mqttCloud.publish(lines[0], newJSON, { qos: 0, retain: false })
      }
      fs.unlink('./.updatedone', function (err) {
        if (err) console.log('Error deleting GW update.done lockfile!')
      });
    }
    else {
      console.log('No first run after update (%s)', err)
    }
  });
}

function controlGateway(userTopic, id, par) {
  const { exec } = require('child_process')
  exec((par.sudo) ? "sudo " + par.cmd : par.cmd, (err, stdout, stderr) => {
    var payload = []
    var result = 0
    if (!err) {
      result = 1
      payload.push({ message: stdout.trim() })
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    }
    else {
      payload.push({ message: stderr })
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    }
  })
}

function getUpdateInfo(userTopic, id, par) {
  const { exec } = require('child_process')
  exec("./gateway-change.sh", (err, stdout, stderr) => {
    var payload = []
    var result = 0
    if (!err) {
      result = 1
      payload.push(stdout.trim())
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    }
    else {
      payload.push({ message: "Error getting update information" })
      var newJSON = '{"id":"' + id + '", "result":' + result + ', "payload": ' + JSON.stringify(payload) + '}'
      mqttCloud.publish(userTopic, newJSON, { qos: 0, retain: false })
    }
  })
}

function isEmptyObject(obj) {
  return ((obj === undefined) || Object.keys(obj).length === 0 ? 1 : 0)
  // return Object.keys(obj).length === 0
}

//on startup do something
isStartupAfterUpdate()
