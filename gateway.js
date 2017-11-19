// **********************************************************************************
// Gateway for OpenMiniHub IoT Framework
// **********************************************************************************
// Copyright Martins Ierags, OpenMiniHub (2017)
// **********************************************************************************
var nconf = require('nconf')                                   //https://github.com/indexzero/nconf
var JSON5 = require('json5')                                   //https://github.com/aseemk/json5
var path = require('path')
var serialport = require('serialport')
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

var express     = require('express')
var app         = express()
var bodyParser  = require('body-parser')
var http  = require('http')
var crypto = require('crypto');

//global variable for firmware upload
global.nodeTo = 0
//global variable for gateway system topic
global.systempTopic = 'system/gateway'

var port = 8080

// get an instance of the router for api routes
var apiRoutes = express.Router()

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// start server on our defined port
var server = http.createServer(app).listen(port, function(){
  console.log("Express server listening on port " + port)
})

// 
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://host:' + port + '/api')
})

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'OpenMiniHub API running.' })
})

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes)

serial = new serialport(settings.serial.port.value, { baudrate : settings.serial.baud.value, parser: serialport.parsers.readline("\n"), autoOpen:false})

serial.on('error', function serialErrorHandler(error) {
    //Send serial error messages to console.
    console.error(error.message)
})

serial.on('close', function serialCloseHandler(error) {
    console.error(error.message)
    process.exit(1)
})

serial.on('data', function(data) { processSerialData(data) })

serial.open()

NodeDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
BuildingDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
MessageDB.persistence.setAutocompactionInterval(settings.database.compactDBInterval.value) //compact the database every 24hrs
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
  MessageDB.find({ "mqtt": { $exists: true }}, function (err, entries) {
    if (!err)
    {
      console.log('==============================');
      console.log('* Subscribing to MQTT topics *');
      console.log('==============================');
      for (var n in entries)
      {
        if (entries[n].mqtt) //enabled events only
        {
          mqttCloud.subscribe(entries[n].mqtt+'/set')
          console.log('%s', entries[n].mqtt);
        }
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
    console.log('MQTT: %s %s', topic, message)
    stopic = topic.split('/')
    switch (stopic[0]) {
      case 'user':
        return handleUserMessage(topic, message)
      // default:
        // return handleSendMessage(topic, message)
    }
  }
  console.log('No handler for topic %s', topic)
})

mqttLocal.on('message', (topic, message) => {
  if (message.toString().trim().length > 0)
  {
    console.log('MQTT: %s %s', topic, message)
    stopic = topic.split('/')
    switch (stopic[0]) {
      case 'system':
        switch (stopic[1]) {
          case 'gateway':
            return handleGatewayMessage(topic, message)
          case 'node':
            return handleNodeMessage(topic, message)
          default:
            return false;
        }
      case 'user':
        return handleUserMessage(topic, message)
      case 'gateway':
        return handleGatewayMessage(topic, message)
      default:
        return handleSendMessage(topic, message)
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
  console.log('RX > %s', rxmessage)

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
      NodeDB.update({ "networkid" : msg[0] }, { $addToSet: { "contact": NodeContact } }, {}, function () {
      })
      break
    case '1': //set
      MessageDB.find({ "networkid" : msg[0], "contactid": msg[1], "message": msg[4] }, function (err, entries) {
        // console.log('error: %s', err)
        if (!err)
        {
          // console.log('entries: %s', entries.length)
          if (entries.length==1)
          {
            // console.log('update: %s', entries.length)
            dbMessage = entries[0]
            dbMessage.value = msg[5]
            dbMessage.updated = new Date().getTime()
            dbMessage.rssi = messageRSSI
            updateStr = JSON.stringify(dbMessage)
            MessageDB.update({ _id: dbMessage._id }, { $set: { "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI } }, {}, function (err, numReplaced) {   // Callback is optional
            })
          }
          else if (entries==0)
          {
            // console.log('insert: %s', entries.length)
            //Find contact type before 1st insert & do insert only if node & contact is presented
            //This will avoid inserting wrong messages if there is RF network disruption
            NodeDB.find({ "networkid" : msg[0], "contact.id": msg[1] }, function (err, entries) {
              if (!err)
              {
                if (entries.length==1)
                {
                  for (var c in entries[0].contact)
                  {
                    if (entries[0].contact[c].id == msg[1])
                    {
                      // console.log('Node: %s Contact: %s Type: %s', msg[0], msg[1], entries[0].contact[c].type)
                      MessageDB.update({ "networkid" : msg[0], "contactid": msg[1], "message": msg[3] }, { "networkid" : msg[0], "contactid": msg[1], "contacttype": entries[0].contact[c].type, "message": msg[4], "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI }, { upsert: true }, function (err, numAffected, affectedDocuments, upsert) {
                      })
                    }
                  }
                }
              }
            })
          }
        }


        // console.log('is entries: %s', entries.length)
        // MessageDB.update({ "networkid" : msg[0], "contactid": msg[1], "message": msg[3] }, { "networkid" : msg[0], "contactid": msg[1], "message": msg[4], "value": msg[5], "updated": new Date().getTime(), "rssi": messageRSSI }, { upsert: true }, function (err, numAffected, affectedDocuments, upsert) {
        // console.log('numAffected: %s', numAffected)
        // console.log('affectedDocuments: %s', JSON.stringify(affectedDocuments))
        // console.log('upsert: %s', upsert)
        // })
      })
      break
    case '3':  //internal
      if (msg[1] == 255) //Internal presentation message
      {
        if (msg[4] == '11')  //Name
        {
          NodeDB.update({ "networkid" : msg[0] }, { $set: { type: nodetype, name: msg[5], } }, { upsert: true })
          // mqttCloud.publish('system/node/'+msg[0]+'/name', msg[5], {qos: 0, retain: false})
        }
        if (msg[4] == '12')  //Version
        {
          NodeDB.update({ "networkid" : msg[0] }, { $set: { version: msg[5] } }, { upsert: true })
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
    } catch (e) {
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
    try {
      var msg = JSON.parse(message);
    } catch (e) {
      return console.error(e)
    }
    var userTopic = 'user/'+splitTopic[1]+'/out'
    switch (msg.cmd) {
      case 'listUnusedNodes':
        listUnusedNodes(userTopic, msg.id, msg.parameters)
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
      case 'attachNodeToObject':
        attachNodeToObject(userTopic, msg.id, msg.parameters)
        break
      case 'listNodesForObject':
        listNodesForObject(userTopic, msg.id, msg.parameters)
        break
      case 'getNodeContactValues':
        getNodeContactValues(userTopic, msg.id, msg.parameters)
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

function handleSendMessage(topic, message) {
  var findTopic = topic.toString().split('/set') //TO DO: remove /set in correct way
  NodeDB.find({ "contact.message.mqtt" : findTopic[0] }, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        var mqttTopic = topic.toString().split('/set')
        var dbNode = entries[0]
        for (var c=0; c<dbNode.contact.length; c++)
        {
          for (var m=0; m<dbNode.contact[c].message.length; m++)
          {
            if (dbNode.contact[c].message[m].mqtt == mqttTopic[0])
            {
              console.log('TX > %s;%s;1;1;%s;%s', dbNode._id, dbNode.contact[c].id, dbNode.contact[c].message[m].type, message)
              serial.write(dbNode._id + ';' + dbNode.contact[c].id + ';1;1;' + dbNode.contact[c].message[m].type + ';' + message + '\n', function () { serial.drain(); });
            }
          }
        }
      }
    }
  })
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

// - listUnusedNodes => {[id:2,name:node_name,versio:1.0], [id:3,name:node_name,versio:2.1]}
function listUnusedNodes(userTopic, id, par) {
  NodeDB.find({ networkid: { $exists: true }}, function (err, entries) {
    if (!err)
    {
      var payload = [];
      for (var n in entries)
      {
        // console.log('networkid: %s', entries[n].networkid)
        var dbNode = entries[n]
        BuildingDB.find({ "nodes": dbNode.networkid }, function (err, entries) {
          // console.log('entries: %s', entries.length)
          // console.log('err: %s', err)
          if (!err && entries.length == 0)
          {
            payload.push(dbNode)
            // console.log('payload: %s', JSON.stringify(payload))
          }
          if (this.nodesLeft == 0)
          {
            var newJSON = '{"id": "'+id+'", "payload": '+JSON.stringify(payload)+'}'
            mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
          }
        }.bind({dbNode: dbNode, nodesLeft: entries.length-n-1}))
      }
    }
  })
}

// - getNodeContacts => [{id:"2", type:6}, {id:"3", type: 8}]
// function getNodeContacts(userTopic, id, par) {
//   NodeDB.find({ _id : par.nodeID }, function (err, entries) {
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
  MessageDB.find({ networkid : { $in: par.nodeID } }, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        payload = []
        for (var n in entries)
        {
          // payload.push(entries[n])
          payload.push({networkid: entries[n].networkid,
                        contactid: entries[n].contactid,
                        message: entries[n].message,
                        value: entries[n].value,
                        updated: entries[n].updated,
                        rssi: entries[n].rssi,
                        id: entries[n]._id
          });
        }
        var newJSON = '{"id": "'+id+'", "payload": '+JSON.stringify(payload)+'}'
        mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
      }
    }
  })
}

// function getNodeDetails(userTopic, id, par) {
//   NodeDB.find({ networkid: { $exists: true }}, function (err, entries) {
//     if (!err)
//     {
//       var payload = [];
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
  // BuildingDB.find({ building : par.building }, function (err, entries) {
    var dbObject = new Object()
    dbObject.name = par.name
    dbObject.parentObject = 
    dbObject.parentObject = (par.parentObject === undefined) ? "" : par.parentObject;
    dbObject.nodes = new Array()

    BuildingDB.insert(dbObject, function (err, newEntry) {
      if (!err)
      {
        var newJSON = '{"id": "'+id+'", "payload": "true"}'
      }
      else
      {
        var newJSON = '{"id": "'+id+'", "payload": "false"}'
      }
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    })
  // })
}

function listObjects(userTopic, id, par) {
  var objectID = ""
  if ( par != undefined )
  {
    objectID = (par.parentObject === undefined) ? "" : par.parentObject
  }
  BuildingDB.find({ parentObject : objectID }, function (err, entries) {
    var payload = [];
    if (entries.length > 0)
    {
      for (var i=0; i<entries.length; i++)
      {
        payload.push({name: entries[i].name, id: entries[i]._id, nodes: entries[i].nodes});
      }
      var newJSON = '{"id": "'+id+'", "payload": '+JSON.stringify(payload)+'}'
    }
    else
    {
      var newJSON = '{"id": "'+id+'", "payload": '+JSON.stringify(payload)+'}'
    }
    mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
  })
}

function removeObject(userTopic, id, par) {
  //TODO: get list of objects and delete all at once
  BuildingDB.remove({_id : { $in: par.objectID } }, { multi: true }, function (err, numRemoved) {
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

function attachNodeToObject(userTopic, id, par) {
  BuildingDB.update({ _id: par.objectID }, { $push: { nodes: par.nodeID } }, {}, function (err, numAffected) {
    if (!err && numAffected > 0)
    {
      var newJSON = '{"id": "'+id+'", "payload": "true"}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
    else
    {
      var newJSON = '{"id": "'+id+'", "payload": "flase"}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
  })
}

// - listNodesForRoom => ["1", "23"]
function listNodesForObject(userTopic, id, par) {
  BuildingDB.find({ _id: par.objectID }, function (err, entries) {
    if (entries.length == 1)
    {
      var listJSON='{"nodes":['
      for (var n=0; n<entries[0].nodes.length; n++)
      {
        listJSON = listJSON + '"'+entries[0].nodes[n]+'"'
        if (n<entries[0].nodes.length-1)
          listJSON += ","
      }
      listJSON += ']}'
      var newJSON = '{"id": "'+id+'", "payload": '+listJSON+'}'
      mqttCloud.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
  })
}

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


// - getNodeValues => ["22.3"]

//on startup do something
