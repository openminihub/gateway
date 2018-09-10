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
settings = nconf.get('settings');
var mqtt = require('mqtt')
var mqttCloud  = mqtt.connect('mqtt://'+settings.mqtt.server.cloud.name.value+':'+settings.mqtt.server.cloud.port.value, {username:settings.mqtt.server.cloud.username.value, password:settings.mqtt.server.cloud.password.value})
var mqttLocal  = mqtt.connect('mqtt://'+settings.mqtt.server.local.name.value+':'+settings.mqtt.server.local.port.value, {username:settings.mqtt.server.local.username.value, password:settings.mqtt.server.local.password.value})
var Datastore = require('nedb')
NodeDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.node.value), autoload: true})
BuildingDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.building.value), autoload: true})
MessageDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.message.value), autoload: true})
DeviceTypeDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.devicetype.value), autoload: true})
DeviceDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.device.value), autoload: true})
ContactDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.contact.value), autoload: true})
ContactMessageDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.contactmessage.value), autoload: true})
ActionDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.action.value), autoload: true})
UserDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.user.value), autoload: true})

var Influx = require('influx')
// var express     = require('express')
// var app         = express()
// var bodyParser  = require('body-parser')
// var http  = require('http')
// var crypto = require('crypto');

const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'openminihub',
  schema: [
    {
      measurement: 'message',
      fields: {
        nodeid: Influx.FieldType.STRING,
        contactid: Influx.FieldType.STRING,
        contacttype: Influx.FieldType.STRING,
        msgtype: Influx.FieldType.STRING,
        value: Influx.FieldType.STRING,
        updated: Influx.FieldType.INTEGER
      // }
      },
      tags: [
        'host'
      ]
    }
  ]
})

var log = console.log
console.log = function () {
  var first_parameter = arguments[0]
  var other_parameters = Array.prototype.slice.call(arguments, 1)

  function formatConsoleDate (date) {
    var hour = date.getHours()
    var minutes = date.getMinutes()
    var seconds = date.getSeconds()
    var milliseconds = date.getMilliseconds()
      return '[' +
             ((hour < 10) ? '0' + hour: hour) +
             ':' +
             ((minutes < 10) ? '0' + minutes: minutes) +
             ':' +
             ((seconds < 10) ? '0' + seconds: seconds) +
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

// var port = 8080

// get an instance of the router for api routes
// var apiRoutes = express.Router()

// use body parser so we can get info from POST and/or URL parameters
// app.use(bodyParser.urlencoded({ extended: false }))
// app.use(bodyParser.json())

// start server on our defined port
// var server = http.createServer(app).listen(port, function(){
//   console.log("Express server listening on port " + port)
// })

// 
// app.get('/', function(req, res) {
//     res.send('Hello! The API is at http://host:' + port + '/api')
// })

// route to show a random message (GET http://localhost:8080/api/)
// apiRoutes.get('/', function(req, res) {
//   res.json({ message: 'OpenMiniHub API running.' })
// })

// apply the routes to our application with the prefix /api
// app.use('/api', apiRoutes)

var serial = new SerialPort(settings.serial.port.value, {baudRate : settings.serial.baud.value, autoOpen: false}, function (error) {
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

serialParser.on('data', function(data) { processSerialData(data) })

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
DeviceTypeDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
DeviceDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
// BuildingDB.getAutoId = function (cb) {
//     this.update(
//         { _id: '__autoid__' },
//         { $inc: { seq: 1 } },
//         { upsert: true, returnUpdatedDocs: true },
//         function (err, affected, autoid) { 
//             cb && cb(err, autoid.seq);
//         }
//     );
//     return this;
// };

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
  //on startup subscribe to all node topics
  MessageDB.find({ node : { $exists: true } }, function (err, entries) {
    if (!err)
    {
      console.log('==============================');
      console.log('* Subscribing to MQTT topics *');
      console.log('==============================');
      for (var n in entries)
      {
        var mqttTopic = 'node/'+entries[n].node+'/'+entries[n].contact+'/'+entries[n].message+'/set'
        mqttLocal.subscribe(mqttTopic)
        console.log('%s', mqttTopic);
      }
      console.log('==============================');
    }
    else
    {
      console.log('ERROR:%s', err)
    }
  })
  //system configuration topics
  mqttLocal.subscribe('system/gateway')
  mqttLocal.subscribe('user/login')
  mqttLocal.subscribe('system/login')
  mqttLocal.subscribe('gateway/in')
  mqttLocal.subscribe('system/node/?/?/?/set')
  // mqttCloud.subscribe('gateway')
  // mqttCloud.subscribe('user/user1/#')
  mqttLocal.subscribe('user/+/in')
  mqttLocal.subscribe('gateway/node/+/out')
  console.log('+connection to local mqtt OK')
})

mqttCloud.on('message', (topic, message) => {
  if (message.toString().trim().length > 0)
  {
    console.log('MQTT < %s %s', topic, message)
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
  if (message.toString().trim().length > 0)
  {
    console.log('MQTT < %s %s', topic, message)
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
//      default:
    }
  }
  console.log('No handler for topic %s', topic)
})

function handleOutTopic(rxmessage, nodetype) {
  var message = rxmessage
  var rssiIdx = rxmessage.indexOf(' [RSSI:') //not found = -1
  var messageRSSI
  if (rssiIdx > 0)
  {
    message = rxmessage.substr(0, rssiIdx);
    messageRSSI = rxmessage.substr(rssiIdx+7, rxmessage.length-2-(rssiIdx+7))
    // console.log('rssi: %s', messageRSSI)
  }
  else
  {
    messageRSSI=''
  }
  //if FLX?OK then update firmware for OpenNode
  if (message.toString().trim() == 'FLX?OK')
  {
    if (global.nodeTo)
    {
      readNextFileLine(global.hexFile, 0)
      console.log('Transfering firmware...')
    }
    return true
  }
  if (message.toString().trim() == 'TO:5:OK')
  {
    if (global.nodeTo == 0)
    {
      var toMsg = message.toString().split(':')
      NodeDB.find({ _id : toMsg[1] }, function (err, entries) {
        if (entries.length == 1)
        {
          dbNode = entries[0]
          // global.hexFile = new readFile('./firmware/GarageNode/GarageNode_v1.1.hex')
          global.nodeTo = dbNode._id
          nconf.use('file', { file: './firmware/versions.json5' })
          var nodeFirmware = nconf.get('versions:'+dbNode.name+':firmware')
          // console.log('FW > %s', nodeFirmware)
          global.hexFile = new readFile('./firmware/'+nodeFirmware)
          serial.write('FLX?' + '\n', function () { serial.drain(); })
          console.log('Requesting Node: %s update with FW: %s', global.nodeTo, nodeFirmware)
        }
      })
      return true
    }
    else
      return false
  }
  if (message.toString().trim() == 'FLX?NOK')
  {
    console.log('Flashing failed!')
    global.nodeTo = 0
    return false
  }
  if (message.substring(0, (4 > message.length - 1) ? message.length - 1 : 4) == 'FLX:')
  {
    var flxMsg = message.toString().split(':')
    if (flxMsg[1].trim() == 'INV')
    {
      console.log('Flashing failed!')
      global.nodeTo = 0
      return false
     }
    else if (flxMsg[2].trim() == 'OK')
      readNextFileLine(global.hexFile, parseInt(flxMsg[1])+1)
    return true

  }

  //regular message
  console.log('RX   > %s', rxmessage)

  //get node networkID
  // var fndMsg = message.toString().split(';')
  //Not a valid message
  // if (fndMsg.length < 5) return false
  //take off all not valid symbols
  var trim_msg = message.replace(/(\n|\r)+$/, '')
  //get node networkID
  var msg = trim_msg.toString().split(';')
  //internal-3, presentation-0, set-1, request-2, stream-4
  switch (msg[2]) {
    case '0': //presentation
      var NodeContact = new Object()
      NodeContact.id = msg[1]
      NodeContact.type = msg[4]
      NodeDB.update({ "networkid" : msg[0] }, { $addToSet: { "contacts": NodeContact } }, {}, function () {
      })
      break
    case '1': //set
      // if (msg.length > 5)
      // {
      //   var updateCon = {$set:{ "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI }}
      // }
      // else
      // {
      //   var updateCon = {$set:{ "updated": new Date().getTime(), "rssi": messageRSSI }}
      // }
      // console.log('* updateCon: %s', JSON.stringify(updateCon))

      // console.log('* find is node networkid: %s registered', msg[0])          
      NodeDB.find({ $and: [{ "networkid" : msg[0], "contacts.id": msg[1]}] }, function (err, entries) {
        if (!err)
        {
          if (entries.length==1)
          {
            // console.log('* node networkid %s found', entries[0].networkid)
            MessageDB.update({ $and: [{"nodeid" : entries[0]._id}, {"contactid": msg[1]}, {"msgtype": msg[4]}] }, { $set: { "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI } }, { returnUpdatedDocs : true , multi : false }, function (err, wasAffected, affectedDocument ) {
              if (!err)
              {
                if (!wasAffected) //The row wasn't updated : Create new entry
                {
                  // console.log('node contacts cnt: %s', this.entries[0].contacts.length)
                  for (var c in this.entries[0].contacts)
                  {
                    if (this.entries[0].contacts[c].id == msg[1])
                    {
                      MessageDB.update({ "nodeid" : this.entries[0]._id, "contactid": msg[1], "msgtype": msg[4] }, { "nodeid" : this.entries[0]._id, "contactid": msg[1], "contacttype": this.entries[0].contacts[c].type, "msgtype": msg[4], "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI }, { upsert: true }, function (err, numAffected, affectedDocument, upsert) {
                        if (numAffected)
                        {
                          // console.log('doc_id: %s', affectedDocument._id)
                          callAction(affectedDocument)
                          doMessageMapping(affectedDocument)
                          doDeviceSubscribe(affectedDocument)
                          doSaveHistory(affectedDocument)
                        }
                      })
                    }
                  }
                }
                else
                {
                  //Call automation
                  // console.log('doc_id: %s', affectedDocument._id)
                  callAction(affectedDocument)
                  doMessageMapping(affectedDocument)
                  doDeviceSubscribe(affectedDocument)
                  doSaveHistory(affectedDocument)
                }
              }
              else
              {
                  console.log('* MessageDB was not updated. node_id: %s', entries[0]._id)
              }
            }.bind({entries}))
          }
          else
          {
            console.log('* Node is not registered. Node.networkid: %s Node.contact: %s', msg[0], msg[1])
          }
        }
        else
        {
          console.log('* Error searching in NodeDB: %s', err)
        }
      })

/*
      // MessageDB.update({ _id: entries[0]._id }, { $set: { "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI } }, { multi : false }, function (err, numReplaced) {
      MessageDB.update({ $and: [{"node" : msg[0]}, {"contact": msg[1]}, {"message": msg[4]}] }, { $set: { "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI } }, { returnUpdatedDocs : true , multi : false }, function (err, wasAffected, affectedDocument ) {
        if (!err)
        {
          if (!wasAffected) //The row wasn't updated : Create new entry
          {
            //Do insert only if the node is registered
            console.log('* find node networkid: %s', msg[0])          
            NodeDB.find({ $and: [{ "networkid" : msg[0], "contacts.id": msg[1]}] }, function (err, entries) {
              if (!err)
              {
                if (entries.length==1)
                {
                  console.log('* node networkid found: %s', entries[0].node)
                  for (var c in entries[0].contacts)
                  {
                    console.log('* verify: %s = %s', entries[0].contacts[c].id, msg[1])
                    if (entries[0].contacts[c].id == msg[1])
                    {
                      console.log('* message insert')          
                      MessageDB.update({ $and: [{ "networkid" : msg[0], "contact": msg[1], "message": msg[3] }] }, { "networkid" : msg[0], "contact": msg[1], "type": entries[0].contacts[c].type, "message": msg[4], "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI }, { upsert: true }, function (err, numAffected, affectedDocuments, upsert) {
                      })
                    }
                  }
                }
              }
            })
          }
          else
          {
            //Call automation
            // console.log('doc_id: %s', affectedDocument._id)
            callAction(affectedDocument)
            doMessageMapping(affectedDocument)
            doDeviceSubscribe(affectedDocument)
            doSaveHistory(affectedDocument)
          }
        }
      })
*/
/*
      MessageDB.find({ "node" : msg[0], "contact": msg[1], "message": msg[4] }, function (err, entries) {
        if (!err)
        {
          if (entries.length==1)
          {
            MessageDB.update({ _id: entries[0]._id }, { $set: { "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI } }, {}, function (err, numReplaced) {   // Callback is optional
            })
          }
          else if (entries==0)
          {
            //Find contact type before 1st insert & do insert only if node & contact is presented
            //This will avoid inserting wrong messages if there is RF network disruption
            NodeDB.find({ "node" : msg[0], "contacts.id": msg[1] }, function (err, entries) {
              if (!err)
              {
                if (entries.length==1)
                {
                  for (var c in entries[0].contact)
                  {
                    if (entries[0].contact[c].id == msg[1])
                    {
                      MessageDB.update({ "node" : msg[0], "contact": msg[1], "message": msg[3] }, { "node" : msg[0], "contact": msg[1], "type": entries[0].contact[c].type, "message": msg[4], "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI }, { upsert: true }, function (err, numAffected, affectedDocuments, upsert) {
                      })
                    }
                  }
                }
              }
            })
          }
        }
      })
*/
      break
    case '3':  //internal
      if (msg[1] == 255) //Internal contact
      {
        if (msg[4] == '29')  //Change - I_HAS_CHANGE
        {
          // console.log('* I_HAS_CHANGE')          
          MessageDB.find({ $and: [{"networkid": msg[0]}, {changed: "Y"}] }, { _id: 1 }, function (err, entries) {
            if (!err)
            {
              if (entries.length>0)
              {
                 sendMessageToNode(message, entries.length)
                 console.log('* I_HAS_CHANGE: %s', entries.length)
                // MessageMappingDB.find({ $or: [{"_id" : { $in: findDevices } }, {"_id" : { $exists: (findDevices.length === 0) ? true : false } }] }, function (err, entries) {
                // })
                for(var m in entries)
                {
                  sendMessageToNode(entries[m]._id, entries[m].value)
                }
              }
            }
          })
        }
        if (msg[4] == '11')  //Name - I_SKETCH_NAME
        {
          NodeDB.update({ "networkid" : msg[0] }, { $set: { type: nodetype, name: msg[5], } }, { upsert: true })
          // mqttCloud.publish('system/node/'+msg[0]+'/name', msg[5], {qos: 0, retain: false})
        }
        if (msg[4] == '12')  //Version - I_SKETCH_VERSION
        {
          NodeDB.update({ "networkid" : msg[0] }, { $set: { version: msg[5] } }, { upsert: true })
          //TODO if maxversion == undefined then set to *
          // mqttCloud.publish('system/node/'+msg[0]+'/version', msg[5], {qos: 0, retain: false})
        }
      }
      break
    default:
  }
}

function handleGatewayMessage_OLD(topic, message) {
  // console.log('%s: %s', topic, message)
  var splitTopic = topic.toString().split('/')
  //get node list
  if (splitTopic[1] == 'gateway' && message.length > 0)
  {
    try {
      var msg = JSON.parse(message);
    } 
    catch (e) {
      return console.error(e)
    }
    switch (msg.cmd) {
      // case 'listnew':
      //   listNodes(false)
      //   break
      // case 'listall':
      //   listNodes(false)
      //   break
      case 'updateHRFHJsk':
        fs.open('./.updatenow', "wx", function (err, fd) {
          // handle error
          fs.close(fd, function (err) {
            // handle error
            if (err)
            {
              mqttCloud.publish('system/gateway', 'previous update in progress', {qos: 0, retain: false})
            }
            else
            {
              mqttCloud.publish('system/gateway', 'updating', {qos: 0, retain: false})
              const child = execFile('./gateway-update.sh', [''], (error, stdout, stderr) => {
                if (error)
                {
                  mqttCloud.publish('system/gateway', 'update error', {qos: 0, retain: false})
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
  if (splitTopic[1] == 'gateway' && splitTopic[2] == 'include' && message == 'enable')
  {
    console.log('include mode')
    serial.write('*i' +  '\n', function () { serial.drain(); })
  }
  //change gateway password
  if (splitTopic[1] == 'gateway' && splitTopic[2] == 'password' && message.length > 0)
  {
    serial.write('*p' + message + '\n', function () { serial.drain(); })
  }

  if (splitTopic[1] == 'login' && message.length > 0)
  {
    // console.log('login mode')
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      return console.error(e)
    }
    // console.log('MD5: %s', crypto.createHash('md5').update(msg.username).digest("hex"))
    var userMD5 = crypto.createHash('md5').update(msg.username).digest("hex")
    mqttCloud.publish('system/login/'+msg.username, '{"md5": "'+userMD5+'"}', {qos: 0, retain: false})
    mqttCloud.subscribe(userMD5+'/in')
  }
}

function handleGatewayMessage(topic, message) {
  var splitTopic = topic.toString().split('/')
  if (splitTopic[1] == 'node' && splitTopic[3] == 'out' && message.length > 0)
  {
    // console.log('mqtt->mysensors')
    handleOutTopic(splitTopic[2]+';'+message, 'ESP')
  }
}


function handleUserMessage(topic, message) {
  var splitTopic = topic.toString().split('/')
  if (splitTopic[2] == 'in' && message.length > 0)
  {
    var userTopic = 'user/'+splitTopic[1]+'/out'
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      var payload = []
      var result = 0
      payload.push({message: "Error parsing JSON"});
      var newJSON = '{"result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
      return console.error(e)
    }
    switch (msg.cmd) {
      case 'updateGateway':
        updateGateway(userTopic, msg.id, msg.parameters)
        break
      case 'listUnusedDevices':
        listUnusedDevices(userTopic, msg.id, msg.parameters)
        break
      // case 'getNodeContacts':
      //   getNodeContacts(userTopic, msg.id, msg.parameters)
      //   break
      case 'deleteAllBuildings':
        deleteAllBuildings(userTopic, msg.id, msg.parameters)
        break
      case 'createObject':
        createObject(userTopic, msg.id, msg.parameters)
        break
      case 'listObjects':
        listObjects(userTopic, msg.id, msg.parameters)
        break
      case 'removeObject':
        removeObject(userTopic, msg.id, msg.parameters)
        break
      case 'attachDeviceToObject':
        attachDeviceToObject(userTopic, msg.id, msg.parameters)
        break
      // case 'listNodesForObject':
        // listNodesForObject(userTopic, msg.id, msg.parameters)
        // break
      case 'getNodeContactValues':
        getNodeContactValues(userTopic, msg.id, msg.parameters)
        break
      case 'createDeviceType':
        createDeviceType(userTopic, msg.id, msg.parameters)
        break
      case 'createDevice':
        createDevice(userTopic, msg.id, msg.parameters)
        break
      case 'listDeviceTypes':
        listDeviceTypes(userTopic, msg.id, msg.parameters)
        break
      case 'removeDeviceType':
        removeDeviceType(userTopic, msg.id, msg.parameters)
        break
      case 'listDevices':
        listDevices(userTopic, msg.id, msg.parameters)
        break
      case 'removeDevice':
        removeDevice(userTopic, msg.id, msg.parameters)
        break
      case 'getDeviceValues':
        getDeviceValues(userTopic, msg.id, msg.parameters)
        break
      case 'listContactTypes':
        listContactTypes(userTopic, msg.id, msg.parameters)
        break
      case 'listMessageTypes':
        listMessageTypes(userTopic, msg.id, msg.parameters)
        break
      case 'createMessageMapping':
        createMessageMapping(userTopic, msg.id, msg.parameters)
        break
      case 'subscribeDevices':
        subscribeDevices(userTopic, msg.id, msg.parameters)
        break
      case 'listNodes':
        listNodes(userTopic, msg.id, msg.parameters)
        break
      default:
        console.log('No handler for %s %s', topic, message)
    }
  }

  if (splitTopic[1] == 'login' && message.length > 0)
  {
    // console.log('login mode')
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      return console.error(e)
    }
    var userMD5 = crypto.createHash('md5').update(msg.username).digest("hex")
    mqttCloud.publish('user/login/'+msg.username, '{"md5": "'+userMD5+'"}', {qos: 0, retain: false})
    mqttCloud.subscribe('user/'+userMD5+'/in')
  }
}

/*
function handleNodeMessage(topic, message) {
  var splitTopic = topic.toString().split('/')
  //update node
  if (splitTopic[1] == 'node' && splitTopic[3] == 'status' && splitTopic.length == 4 && message.length > 0)
  {
    if (message == 'update')
      nodeOTA(splitTopic[2])
    if (message == 'waitForUpdate')
      serial.write('*u' + splitTopic[2] + '\n', function () { serial.drain(); });
  }
  //set node contact message MQTT topic
  if (splitTopic[1] == 'node' && splitTopic[5] == 'set' && splitTopic.length == 5 && message.length > 0)
  {
    NodeDB.find({ _id : splitTopic[2] }, function (err, entries) {
      if (entries.length == 1)
      {
        dbNode = entries[0]
        var contactFound = false
        for (var c=0; c<dbNode.contact.length; c++)
        {
          if (dbNode.contact[c].id == splitTopic[3])
          {
            for (var m=0; m<dbNode.contact[c].message.length; m++)
            {
              if (dbNode.contact[c].message[m].type == splitTopic[4])
              {
                if (dbNode.contact[c].message[m].mqtt != message)
                {
                  var oldTopic = dbNode.contact[c].message[m].mqtt
                  var updateCon = {$set:{}}
                  updateCon.$set["contact."+c+".message."+m+".mqtt"] = message.toString()
                  NodeDB.update({ _id: splitTopic[2], "contact.id": splitTopic[3] }, updateCon )
                  //change subscription
                  mqttCloud.subscribe(message+'/set')
                  mqttCloud.unsubscribe(oldTopic+'/set')
                  //exit loop
                  contactFound = true
                  break
                }
              }
            }
          }
          if (contactFound)
            break
        }
      }
    })
  }
}
*/

function handleSendMessage(topic, message) {
  // var trim_msg = topic.replace(/(\n|\r)+$/, '')
  var tpc = topic.toString().split('/')
  MessageDB.find({ $and: [{"node" : tpc[1]}, {"contact": tpc[2]}, {"message": tpc[3]}] }, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        var txOpenNode = entries[0].node+';'+entries[0].contact+';1;1;'+entries[0].message+';'+this.message+'\n'
        console.log('TX   > %s', txOpenNode)
        // serial.write(txOpenNode, function () { serial.drain(); });
      }
    }
  }.bind({message}))
}

function nodeOTA(nodeid, firmware) {
    serial.write('TO:' + nodeId + '\n', function () { serial.drain(); });
}

function readNextFileLine(hexFile, lineNumber) {

  var fileLine;
  if (fileLine = hexFile.next()) {
    if (fileLine.toString('ascii').trim() == ":00000001FF")
    {
      global.nodeTo = 0
      console.log('Firmware successfully transfered')
      serial.write('FLX?EOF' + '\n', function () { serial.drain(); });
    }
    else
    {
      serial.write('FLX:' + lineNumber + fileLine.toString('ascii').trim() + '\n', function () { serial.drain(); });
    }
  }
}

//API
function deleteAllBuildings(userTopic, id, par) {
  BuildingDB.remove({}, { multi: true }, function (err, numRemoved) {
    if (numRemoved > 0)
    {
      var newJSON = '{"id": "'+id+'", "payload": "true"}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
      return
    }
    else
    {
      var newJSON = '{"id": "'+id+'", "payload": "false"}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
      return
    }
  })
}

function listUnusedDevices(userTopic, id, par) {
  DeviceDB.find({ device: { $exists: true }}, function (err, entries) {
    if (!err)
    {
      var payload = []
      var result = 0
      for (var n in entries)
      {
        var dbDevice = entries[n]
        BuildingDB.find({ "devices": dbDevice._id }, function (err, entries) {
          if (!err)
          {
            if (entries.length == 0) //device not attached
            {
              payload.push({device: dbDevice.device,
                            name: dbDevice.name,
                            messages: dbDevice.messages,
                            object: dbDevice.object,
                            id: dbDevice._id
              });
              result = 1
            }
            if (this.myDevicesLeft == 0)
            {
              var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
              mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
            }
          }
          else
          {
            payload.push({message: "Error searching for device in Places"});
          }
        }.bind({dbDevice: dbDevice, myDevicesLeft: entries.length-n-1}))
      }
    }
    else
    {
      var payload = []
      var result = 0
      payload.push({message: "Error searching devices"});
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
  })
}

function getDeviceValues(userTopic, id, par) {
  var query = new Object()
  if (par == undefined)
  {
    query={"_id": { $exists: true }}
  }
  else if (isEmptyObject(par))
  {
    query={"_id": { $exists: true }}
  }
  else
  {
    query=((par.device === undefined) || isEmptyObject(par.device) ? {"_id": {$exists : true}} : {"_id": { $in : par.device }})
  }
  DeviceDB.find( query, function (err, entries) {
    if (!err)
    {
      var payload = []
      var result = 1
      for (var n in entries)
      {
        var dbDevice = entries[n]
        for (var c in dbDevice.contact)
        {
          MessageDB.find({ $and: [{ "nodeid" : dbDevice.contact[c].nodeid, "contactid": dbDevice.contact[c].contactid}] }, function (err, entries) { //["mFUIV160p9KFLr0P"]
            // console.log('entries: %s', entries.length)
            // console.log('err: %s', err)
            if (!err && entries.length > 0)
            {
              payload.push({devicetypeid: this.dbDevice._id,
                            objectid: this.dbDevice.objectid,
                            nodeid: entries[0].nodeid,
                            contactid: entries[0].contactid,
                            contacttype: entries[0].contacttype,
                            msgtype: entries[0].msgtype,
                            value: entries[0].value,
                            updated: entries[0].updated,
                            rssi: entries[0].rssi,
                            id: entries[0]._id
              });
              result = 1
              // console.log('payload: %s', JSON.stringify(payload))
            }
            if (this.devicesLeft == 0)
            {
              var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
              mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
            }
          }.bind({dbDevice: dbDevice, devicesLeft: entries.length-n-1}))
        }
      }
    }
  })
}

function listNodes(userTopic, id, par) {
  NodeDB.find({ networkid: { $exists: true }}, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        payload = []
        var result = 1
        for (var n in entries)
        {
          // payload.push(entries[n])
          // {"node":"23","type":"OpenNode","name":"DHT22-Light","_id":"5WjH550VTrdemYhn","version":"1.3","contacts":[{"id":"1","type":"6"},{"id":"2","type":"7"}]}
          payload.push({networkid: entries[n].networkid,
                        type: entries[n].type,
                        name: entries[n].name,
                        version: entries[n].version,
                        contacts: entries[n].contacts,
                        id: entries[n]._id
          });
        }
        var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
        mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
      }
    }
  })
}

// - getNodeContacts => [{id:"2", type:6}, {id:"3", type: 8}]
// function getNodeContacts(userTopic, id, par) {
//   NodeDB.find({ _id : par.node }, function (err, entries) {
//     if (!err)
//     {
//       if (entries.length > 0)
//       {
//         for (var n=0; n<entries.length; n++)
//         {
//           var dbNode = entries[n]
//           var newJSON = '{"id":"'+id+'", "payload": ['
//           for (var c=0; c<dbNode.contact.length; c++)
//           {
//             for (var m=0; m<dbNode.contact[c].message.length; m++)
//             {
//               // newJSON += '{"contactid": "'+dbNode.contact[c].id+'", "contacttype": "'+dbNode.contact[c].type+'", "msgtype": "'+dbNode.contact[c].message[m].type+'"}'
//               newJSON += '{"contactid": "'+dbNode.contact[c].id+'", "contacttype": "'+dbNode.contact[c].type+'", "msgtype": "'+dbNode.contact[c].message[m].type+'", "msgvalue": "'+dbNode.contact[c].message[m].value+'"}'
//               if (m < dbNode.contact[c].message.length-1 || c < dbNode.contact.length-1)
//                 newJSON += ', '
//               // console.log('%s', newJSON)
//             }
//           }
//           newJSON += ']}'
//           mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
//         }
//       }
//     }
//   })
// }

// - getNodeContactValues => ["22.3"]
function getNodeContactValues(userTopic, id, par) {
  MessageDB.find({ node : { $in: par.nodes } }, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        payload = []
        var result = 1
        for (var n in entries)
        {
          // payload.push(entries[n])
          payload.push({node: entries[n].node,
                        contact: entries[n].contact,
                        type: entries[n].type,
                        message: entries[n].message,
                        value: entries[n].value,
                        updated: entries[n].updated,
                        rssi: entries[n].rssi,
                        id: entries[n]._id
          });
        }
        var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
        mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
      }
    }
  })
}

// function getNodeDetails(userTopic, id, par) {
//   NodeDB.find({ networkid: { $exists: true }}, function (err, entries) {
//     if (!err)
//     {
//       var payload = []
//       for (var n in entries)
//       {
//         // console.log('networkid: %s', entries[n].networkid)
//         var dbNode = entries[n]
//         BuildingDB.find({ "nodes": dbNode.networkid }, function (err, entries) {
//           // console.log('entries: %s', entries.length)
//           // console.log('err: %s', err)
//           if (!err && entries.length == 0)
//           {
//             payload.push(dbNode)
//             // console.log('payload: %s', JSON.stringify(payload))
//           }
//           if (this.nodesLeft == 0)
//           {
//             var newJSON = '{"id": "'+id+'", "payload": '+JSON.stringify(payload)+'}'
//             mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
//           }
//         }.bind({dbNode: dbNode, nodesLeft: entries.length-n-1}))
//       }
//     }
//   })
// }


// - setContactName nodeid, contactid, msgtype, name
// function setContactName(userTopic, id, par) {
// }

function createObject(userTopic, id, par) {
    var dbObject = new Object()
    dbObject.name = par.name
    // dbObject.parentObject = 
    dbObject.parentid = (par.parentid === undefined) ? "" : par.parentid;
    dbObject.devices = new Array()

    var payload = []
    var result = 0
    BuildingDB.insert(dbObject, function (err, newEntry) {
      if (!err)
      {
        payload.push({id: newEntry._id});
        result = 1
      }
      else
      {
        payload.push({message: "Problem creating new place"});
      }
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    })
  // })
}

function listObjects(userTopic, id, par) {
  var findObjects = [""]
  if ( par != undefined )
  {
    findObjects = (par.parentid === undefined) ? findObjects : par.parentid
  }
  // BuildingDB.find({ $or: [{parent : { $in: findObjects} }, {parent : { $exists: (findObjects.length === 0) ? true : false } }] }, function (err, entries) {
  BuildingDB.find({ parentid : { $in: findObjects} }, function (err, entries) {
    var payload = []
    var result = 0
    if (!err)
    {
      if (entries.length > 0)
      {
        for (var i=0; i<entries.length; i++)
        {
          payload.push({name: entries[i].name, parentid: entries[i].parentid, devices: entries[i].devices, id: entries[i]._id});
          result = 1
        }
      }
      else
      {
        // payload.push({message: "No result for specified search criteria"});
        result = 1
      }
    }
    // else
    // {
      // payload.push({message: "Error listing objects"});
    // }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function removeObject(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.id == undefined)
  {
    payload.push({message: "No parameter specified"});
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  }
  else
  {
    BuildingDB.remove({_id : { $in: par.id } }, { multi: true }, function (err, numRemoved) {
      if (numRemoved > 0)
      {
        payload.push({message: "Place deleted"});
        result = 1
      }
      else
      {
        payload.push({message: "Error removing place"});
      }
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    })
  }
}

function attachDeviceToObject(userTopic, id, par) {
  BuildingDB.update({ _id: par.object }, { $push: { devices: par.device } }, {}, function (err, numAffected) {
    var payload = []
    var result = 0
    if (!err && numAffected > 0)
    {
      payload.push({message: "Device attached"});
      result = 1
    }
    else
    {
      payload.push({message: "Error attaching device to object"});
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

// function listNodesForObject(userTopic, id, par) {
//   BuildingDB.find({ _id: par.object }, function (err, entries) {
//     if (entries.length == 1)
//     {
//       var listJSON='{"nodes":['
//       for (var n=0; n<entries[0].nodes.length; n++)
//       {
//         listJSON = listJSON + '"'+entries[0].nodes[n]+'"'
//         if (n<entries[0].nodes.length-1)
//           listJSON += ","
//       }
//       listJSON += ']}'
//       var newJSON = '{"id": "'+id+'", "payload": '+listJSON+'}'
//       mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
//     }
//   })
// }

function mqttPublish(topic, message, options, server) {
  if (server=='cloud')
    mqttCloud.publish(topic, message, options)
  else
    mqttLocal.publish(topic, message, options)
}
 
// function mqttCient.subscribe(topic) {
//   mqttCloud.subscribe(topic)
//   mqttLocal.subscribe(topic)
// }

function createDeviceType(userTopic, id, par) {
  var dbDeviceType = new Object()
  dbDeviceType.name = par.name
  dbDeviceType.contacttype = par.contacttype

  var payload = []
  var result = 0
  DeviceTypeDB.insert(dbDeviceType, function (err, newEntry) {
    var newJSON = ''
    if (!err)
    {
      payload.push({id: newEntry._id});
      result = 1
    }
    else
    {
      payload.push({message: "Problem creating device type"});
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function listDeviceTypes(userTopic, id, par) {
  var findContactType = []
  if ( par != undefined )
  {
    findContactType = (par.contacttype === undefined) ? findContactType : par.contacttype
  }
  DeviceTypeDB.find({ $or: [{contacttype : { $in: findContactType} }, {contacttype : { $exists: (findContactType.length === 0) ? true : false } }] }, function (err, entries) {
    var payload = []
    var result = 0
    if (entries.length > 0)
    {
      for (var i=0; i<entries.length; i++)
      {
        payload.push({name: entries[i].name, contacttype: entries[i].contacttype, id: entries[i]._id});
      }
      result = 1
    }
    else
    {
      // payload.push({message: "No result for specified search criteria"});
      result = 1
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function removeDeviceType(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.id == undefined)
  {
    payload.push({message: "No parameter specified"});
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  }
  else
  {
    DeviceTypeDB.remove({_id : { $in: par.id } }, { multi: true }, function (err, numRemoved) {
      if (numRemoved > 0)
      {
        payload.push({message: "Device type deleted"});
        result = 1
      }
      else
      {
        payload.push({message: "Error removing device type"});
      }
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    })
  }
}

function createDevice(userTopic, id, par) {
    var dbDevice = new Object()
    dbDevice.devicetypeid = par.devicetypeid
    dbDevice.name = par.name
    dbDevice.objectid = par.objectid
    dbDevice.contact = par.contact

    DeviceDB.insert(dbDevice, function (err, newEntry) {
      var payload = []
      var result = 0
      if (!err)
      {
        // BuildingDB.update({ _id: newEntry.object }, { $push: { devices: newEntry._id } }, {}, function (err, numAffected) {
          // if (!err && numAffected > 0)
          // {
            payload.push({id: newEntry._id});
            result = 1
          // }
          // else
          // {
            // payload.push({message: "Error adding new device to place"});
          // }
          // var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
          // mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
        // })
      }
      else
      {
        payload.push({message: "Error creating new device"});
      }
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    })
  // })
}

function listDevices(userTopic, id, par) {
  var query = new Object()
  if (par == undefined)
  {
    query={devicetypeid: { $exists: true }}
  }
  else if (isEmptyObject(par))
  {
    query={devicetypeid: { $exists: true }}
  }
  else
  {
    query.$and = new Array()
    query.$and.push((par.devicetypeid === undefined) || isEmptyObject(par.devicetypeid) ? {devicetypeid: {$exists : true}} : {devicetypeid: { $in : par.devicetypeid }})
    query.$and.push((par.objectid === undefined) || isEmptyObject(par.objectid) ? {objectid: {$exists : true}} : {objectid: { $in : par.objectid }})
    query.$and.push((par.contacttype === undefined) || isEmptyObject(par.contacttype) ? {"contact.contacttype": {$exists : true}} : {"contact.contacttype": { $in : par.contacttype }})
  }
  // console.log('query: %s', JSON.stringify(query))
  DeviceDB.find( query, function (err, entries) {
    // console.log('error: %s', err)
    // console.log('cnt: %s', entries.length)
    var payload = []
    var result = 0
    if (entries.length > 0)
    {
      for (var i=0; i<entries.length; i++)
      {
        payload.push({devicetypeid: entries[i].device, 
                      name: entries[i].name, 
                      objectid: entries[i].object, 
                      contact: entries[i].contact, 
                      id: entries[i]._id});
      }
      result = 1
    }
    else
    {
      result = 1
      // payload.push({message: "No result for specified search criteria"});
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function removeDevice(userTopic, id, par) {
  var payload = []
  var result = 0
  if (par == undefined || par.id == undefined)
  {
    payload.push({message: "No parameter specified"});
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  }
  else
  {
    DeviceDB.remove({_id : { $in: par.id } }, { multi: true }, function (err, numRemoved) {
      if (numRemoved > 0)
      {
        payload.push({message: "Device deleted"});
        result = 1
      }
      else
      {
        payload.push({message: "Error removing device"});
      }
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    })
  }
}

function listContactTypes(userTopic, id, par) {
  var findContactTypes = []
  if ( par != undefined )
  {
    findContactTypes = (par.contacttypes === undefined) ? findContactTypes : par.contacttypes
  }
  ContactDB.find({ $or: [{_id : { $in: findContactTypes} }, {_id : { $exists: (findContactTypes.length === 0) ? true : false } }] }, function (err, entries) {
    var payload = []
    var result = 0
    if (entries.length > 0)
    {
      for (var i=0; i<entries.length; i++)
      {
        payload.push({name: entries[i].name, value: entries[i].value, id: entries[i]._id});
      }
      result = 1
    }
    else
    {
      result = 1
      // payload.push({message: "No result for specified search criteria"});
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function listMessageTypes(userTopic, id, par) {
  var findMessageTypes = []
  if ( par != undefined )
  {
    findMessageTypes = (par.msgtype === undefined) ? findMessageTypes : par.msgtype
  }
  ContactMessageDB.find({ $or: [{_id : { $in: findMessageTypes} }, {_id : { $exists: (findMessageTypes.length === 0) ? true : false } }] }, function (err, entries) {
    var payload = []
    var result = 0
    if (entries.length > 0)
    {
      for (var i=0; i<entries.length; i++)
      {
        payload.push({name: entries[i].name, value: entries[i].value, id: entries[i]._id});
      }
      result = 1
    }
    else
    {
      result = 1
      // payload.push({message: "No result for specified search criteria"});
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function callAction(message) {
// {"_id":"1","name":"Automation 1","enabled":"1","hide":"0","triggers":[{"type":"state","attribute":"above","entity":"mFUIV160p9KFLr0P","value":"21.0","before":"OFF"}],"conditions":[{"type":"","entity":"","value":""}],"actions":[{"type":"object","attribute":"TURN","entity":"wkor2Xf3h3GQ7vnj","data":"ON"}]}
  ActionDB.find({ "trigger.entity": message._id }, function (err, entries) {
    if (!err && entries.length > 0)
    {
      // console.log('INFO : Action: %s', JSON.stringify(entries[0]))
      switch (entries[0].trigger.type) {
        case 'state':
          var aso = new actionStateOperator(entries[0].trigger.attribute)
          // console.log('INFO : Trigger result: %s', aso.evaluate(message.value, entries[0].trigger.value))
          if (aso.evaluate(message.value, entries[0].trigger.value))
          {
            if ((entries[0].conditions).length > 0)
            {
              console.log('There are conditions')
              var conditionResult = true
              for (var c in entries[0].conditions)
              {
                switch (entries[0].conditions[c].type) {
                case 'state':
                  MessageDB.find({ "_id" : entries[0].conditions[c].entity }, function (err, entries) {
                    if (!err && entries.length > 0)
                    {
                      aso.operation=this.condition.attribute
                      // console.log('INFO : msg value: %s', entries[0].value)
                      // console.log('INFO : cnd value: %s', this.condition.value)
                      conditionResult = conditionResult && aso.evaluate(entries[0].value, this.condition.value) ? true : false
                      // console.log('conditionResult: %s', conditionResult)
                      // console.log('aso.evaluate: %s', aso.evaluate(entries[0].value, this.condition.value))
                      if (conditionResult && this.conditionsLeft == 0)
                      {
                        console.log('INFO : ACTION: %s', JSON.stringify(this.actions))
                      }
                    }
                  }.bind({condition:entries[0].conditions[c], actions:entries[0].actions, message, conditionsLeft: entries[0].conditions.length-c-1}))
                  break
                }
              }
            }
            else
            {
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
  for (var m in message.mapping)
  {
    MessageDB.update({ "_id" : message.mapping[m] }, { $set: { value: message.value, updated: message.updated, changed: "Y" } }, { returnUpdatedDocs : true , multi : false }, function (err, updated, entry) {
      if (!err)
      {
        if (updated)
        {
          console.log('* Message mapping done')
        }
      }
    })
  }
}

function doDeviceSubscribe(message) {
  UserDB.find({messages: message._id }, function (err, entries) {
    for(var u in entries)
    {
      console.log('* %s has subscription', entries[u].user)
      var payload = []
      payload.push({value: this.message.value, updated: this.message.updated, id: this.message._id});
      var result = 1
      var newJSON = '{"id":"'+-1+'", "cmd":"deviceValueUpdate", "result":'+result+', "payload":'+JSON.stringify(payload)+'}'
      mqttCloud.publish('user/'+entries[u].user+'/out', newJSON, {qos: 0, retain: false})
    }
  }.bind({message}))
}


function doSaveHistory(message) {
    influx.writePoints([
      {
        measurement: 'message',
        // tags: { host: os.hostname() },
        tags: { host: "localhost" },
        fields: { nodeid: message.nodeid, contactid: message.contactid, contacttype: message.contacttype, msgtype: message.msgtype, value: message.value, updated: message.updated }
      }
    ]).catch(error => {
      console.error(`Error saving data to InfluxDB: ${error.message}`)
    })
}

function actionStateOperator(op) { //you object containing your operator
    this.operation = op;

    this.evaluate = function evaluate(param1, param2) {
        switch(this.operation) {
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
  if (message.indexOf(';') > 0)
  {
    var txOpenNode = message.replace(/(\n|\r)+$/, '')+data+'\n'
    console.log('TX > %s', txOpenNode.trim())
    serial.write(txOpenNode, function () { serial.drain(); });
  }
  else
  {
  MessageDB.find({ "_id" : message }, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        console.log('message: %s', JSON.stringify(entries[0]))
        NodeDB.find({ _id : entries[0].nodeid }, function (err, entries) {
          if (!err)
          {
            if (entries.length > 0)
            {
              switch (entries[0].type) {
                case 'OpenNode':
                  var txOpenNode = this.dbMessage.node+';'+this.dbMessage.contact+';1;1;'+this.dbMessage.message+';'+this.dbMessage.value+'\n' //+this.data+'\n'
                  console.log('TX > %s', txOpenNode.trim())
                  serial.write(txOpenNode, function () { serial.drain(); });
                  break
                case 'ESP':
                  var mqttTopic = 'gateway/node/'+this.dbMessage.node+'/in'
                  var mqttMessage = this.dbMessage.contact+';1;1;'+this.dbMessage.message+';'+this.data
                  console.log('MQTT > %s %s', mqttTopic, mqttMessage)
                  mqttLocal.publish(mqttTopic, mqttMessage, {qos: 0, retain: false})
                  break
                // default:
              }
            }
          }
          // var txOpenNode = entries[0].node+';'+entries[0].contact+';1;1;'+entries[0].message+';'+this.data+'\n'
          // console.log('TX > %s', txOpenNode.trim())
          // serial.write(txOpenNode, function () { serial.drain(); });
        }.bind({dbMessage:entries[0], data}))
      }
    }
  }.bind({data}))
  }
}

function createMessageMapping(userTopic, id, par) {
  MessageDB.update({ "_id" : par.source }, { $addToSet: { "mapping": par.destination } }, { returnUpdatedDocs : true , multi : false }, function (err, wasUpdated, updatedDocument) {
    var payload = []
    var result = 0
    if (!err)
    {
      if (wasUpdated)
      {
        payload.push({message: "Mapping done"});
        result = 1
      }
    }
    if (!result)
    {
      payload.push({message: "Error mapping device"});
    }
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function subscribeDevices(userTopic, id, par) {
  var splitTopic = userTopic.toString().split('/')
  DeviceDB.find({"_id" : { $in: par.devices } }, function (err, entries) {
    var payload = []
    var result = 0
    var deviceMessages = []
    for (var d in entries)
    {
      deviceMessages = deviceMessages.concat(entries[d].messages)
      if (d == entries.length-1)
      {
        UserDB.update({ "user" : this.user }, { $set: {"messages": deviceMessages} }, { upsert: true }, function () {
        })
      }
    }
    payload.push({message: "Mapping done"})
    result = 1
    var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  }.bind({user:splitTopic[1]}))

}

function updateGateway(userTopic, id, par) {
  var payload = []
  var result = 0
  fs.readFile('./.updatenow', function(err, data) {
    //TO DO: handle old file
    if (!err)
    {
      payload.push({message: "Previous update in progress"})
      var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
    else
    {
      fs.writeFile('./.updatenow', userTopic+'\n'+id+'\n', function (err) {
        if (!err)
        {
          const child = execFile('./gateway-update.sh', [''], (err, stdout, stderr) => {
            if (!err)
            {
              result = 1
              payload.push({message: "Starting gateway update..."})
              var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
              mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
            }
            else
            {
              fs.unlink('./.updatenow', function (err) {
                if (err) console.log('Error deleting GW update lockfile!')
              });
              payload.push({message: "Problem executing gateway update"})
              var newJSON = '{"id":"'+id+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
              mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
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
    if (!err)
    {  
      var filecontent = data
      lines = filecontent.split('\n')
      if (lines.length > 2)
      {
        var payload = []
        var result = 1
        payload.push({message: lines[2]})
        var newJSON = '{"id":"'+lines[1]+'", "result":'+result+', "payload": '+JSON.stringify(payload)+'}'
        mqttCloud.publish(lines[0], newJSON, {qos: 0, retain: false})
      }
      fs.unlink('./.updatedone', function (err) {
        if (err) console.log('Error deleting GW update.done lockfile!')
      });
    }
    else
    {
      console.log('No first run after updete (missing file: %s)', err)
    }
  });
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0
}

//on startup do something
isStartupAfterUpdate()
