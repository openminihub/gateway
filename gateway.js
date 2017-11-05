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
var client  = mqtt.connect('mqtt://'+settings.mqtt.server.value+':'+settings.mqtt.port.value, {username:settings.mqtt.username.value, password:settings.mqtt.password.value})
var Datastore = require('nedb')
NodeDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.node.value), autoload: true})
BuildingDB = new Datastore({filename : path.join(__dirname, dbDir, settings.database.building.value), autoload: true})

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
BuildingDB.getAutoId = function (cb) {
    this.update(
        { _id: '__autoid__' },
        { $inc: { seq: 1 } },
        { upsert: true, returnUpdatedDocs: true },
        function (err, affected, autoid) { 
            cb && cb(err, autoid.seq);
        }
    );
    return this;
};

global.processSerialData = function (data) {
//  console.log('SERIAL: %s', data)
  handleOutTopic(data)
}

//MQTT
client.on('connect', () => {  
  //on startup subscribe to all node topics
  NodeDB.find({ "contact.message.mqtt": { $exists: true }}, function (err, entries) {
    if (!err)
    {
      console.log('==============================');
      console.log('* Subscribing to MQTT topics *');
      console.log('==============================');
      for (var n in entries) {
        //node status topics
        client.subscribe('system/node/'+entries[n]._id+'/status')
        contact = entries[n].contact
          for (var c in contact) {
            message = contact[c].message
              for (var m in message) {
                  // node contact message configuration topics
                  var configNodeTopic = 'system/node/'+entries[n]._id+'/'+contact[c].id+'/'+message[m].type
                  if (message[m].mqtt) //enabled events only
                  {
                    client.subscribe(message[m].mqtt+'/set')
                    console.log('%s', message[m].mqtt);
                    // client.publish(configNodeTopic, message[m].mqtt, {qos: 0, retain: false})
                  }
                  client.subscribe(configNodeTopic+'/set')
              }
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
  client.subscribe('system/gateway')
  client.subscribe('user/login')
  client.subscribe('system/login')
  client.subscribe('gateway/in')
  client.subscribe('system/node/?/?/?/set')
  // client.subscribe('gateway')
  // client.subscribe('user/user1/#')
  client.subscribe('user/+/in')
})

client.on('message', (topic, message) => {
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
      default:
        return handleSendMessage(topic, message)
    }
  }
  console.log('No handler for topic %s', topic)
})

function handleOutTopic(rxmessage) {
  var message = rxmessage
  var rssiIdx = rxmessage.indexOf(' [RSSI:') //not found = -1
  if (rssiIdx > 0)
    message = rxmessage.substr(0, rssiIdx);
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

  console.log('RX > %s', rxmessage)

  var fndMsg = message.toString().split(';')
  //search in db for node
  NodeDB.find({ _id : fndMsg[0] }, function (err, entries) {
      var trim_msg = message.replace(/(\n|\r)+$/, '')
      var msg = trim_msg.toString().split(';')
      if (entries.length == 1)
      {
        dbNode = entries[0]
        var foundContact = false
        if (msg[1] < 255) //not internal contact
        {
          for (var c=0; c<dbNode.contact.length; c++) 
          {
            if (dbNode.contact[c].id == msg[1])
            {
              foundContact = true
              if (msg[2] == '1') // Update node value (C_SET)
              {
                var foundMessage = false
                for (var i=0; i<dbNode.contact[c].message.length; i++)
                {
                  if (dbNode.contact[c].message[i].type == msg[4])
                  {
                    foundMessage = true
                    dbNode.contact[c].message[i].value = msg[5]
                    dbNode.contact[c].message[i].updated = new Date().getTime()
                    var updateCon = {$set:{}}   
                    updateCon.$set["contact."+c+".message."+i+".value"] = msg[5]
                    updateCon.$set["contact."+c+".message."+i+".updated"] = new Date().getTime()
                    NodeDB.update({ _id: msg[0], "contact.id": msg[1] }, updateCon )

                    if (dbNode.contact[c].message[i].mqtt)
                    {
                      var nodeQOS = 0
                      var nodeRetain = false
                      if (dbNode.contact[c].message[i].qos)
                      {
                        nodeQOS = dbNode.contact[c].message[i].qos
                      }
                      if (dbNode.contact[c].message[i].retain)
                      {
                        nodeRetain = dbNode.contact[c].message[i].retain
                      }
                      client.publish(dbNode.contact[c].message[i].mqtt, msg[msg.length-1], {qos: nodeQOS, retain: nodeRetain})
                      //need to improve feature publish events when no payload provided (only 4 variables received)
                    }
                    break
                  }
                }
                if (!foundMessage)
                {
                  var newMessage = new Object()
                  newMessage.type = msg[4]
                  newMessage.value = msg[5]
                  newMessage.updated = new Date().getTime()
                  newMessage.mqtt = ""
                  newMessage.qos = ""
                  newMessage.retain = ""
                  var updateCon = {$push:{}}   
                  updateCon.$push["contact."+c+".message"] = newMessage
                  NodeDB.update({ _id: msg[0], "contact.id": msg[1] }, updateCon )
                }
                //publish message type
                //client.publish('system/node/'+msg[0]+'/'+msg[1]+'/msgtype', msg[4], {qos: 0, retain: false})
                //publish message value
                //client.publish('system/node/'+msg[0]+'/'+msg[1]+'/'+msg[4]+'/value', msg[msg.length-1], {qos: 0, retain: false})  //fix for only 4 variables received
                //subscribe to configuration topic
                client.subscribe('system/node/'+msg[0]+'/'+msg[1]+'/'+msg[4]+'/set')
              }
              if (msg[2]  == '0') // C_PRESENTATION
              {
                var updateCon = {$set:{}}   
                updateCon.$set["contact."+c+".type."] = msg[4]
                NodeDB.update({ _id: msg[0], "contact.id": msg[1] }, updateCon )
                client.publish('system/node/'+msg[0]+'/'+msg[1]+'/type', msg[4], {qos: 0, retain: false})
                break
              }
            }
          }
          if (!foundContact)
          {
            var newContact = new Object()
            newContact.id = msg[1]
            newContact.type = msg[4]
            newContact.message = new Array()
            var updateCon = {$push:{}}   
            updateCon.$push["contact"] = newContact
            NodeDB.update({ _id: msg[0] }, updateCon )
          }
        } 
        else if (msg[1] == 255 && msg[2] == '3') //Internal presentation message
        {
          if (msg[4] == '11')  //Name
          {
            NodeDB.update({ _id: msg[0]}, { $set: { name: msg[5] } })
            client.publish('system/node/'+msg[0]+'/name', msg[5], {qos: 0, retain: false})
    }
          if (msg[4] == '12')  //Version
          {
            NodeDB.update({ _id: msg[0]}, { $set: { version: msg[5] } })
            client.publish('system/node/'+msg[0]+'/version', msg[5], {qos: 0, retain: false})
          }
        }
      }
      else
      {
        //Node not registered: creating the record in db
        dbNode = new Object()
        dbNode._id = msg[0]
        dbNode.name = ""
        dbNode.version = ""
        dbNode.contact = new Array()

        if (msg[2] == '1') // Update node value
        {
          dbNode.contact[0] = new Object()
          dbNode.contact[0].id = msg[1]
          dbNode.contact[0].type = ""
          dbNode.contact[0].message = new Array()
          dbNode.contact[0].message[0] = new Object()
          dbNode.contact[0].message[0].type = msg[4]
          dbNode.contact[0].message[0].value = msg[5]
          dbNode.contact[0].message[0].updated = new Date().getTime()
          dbNode.contact[0].message[0].mqtt = ""
          dbNode.contact[0].message[0].qos = ""
          dbNode.contact[0].message[0].retain = ""
        }
        else if (msg[2] == '0')  // Got present message
        {
          dbNode.contact[0] = new Object()
          dbNode.contact[0].id = msg[1]
          dbNode.contact[0].type=msg[4]
        }
        else if (msg[2] == '3') //Got internal message
        {
          if (msg[4] == '11')  //Name
            dbNode.name = msg[5]
           if (msg[4] == '12')  //Version
            dbNode.version = msg[5]
        }
        // Insert to database
        NodeDB.insert(dbNode, function (err, newEntry) {
            if (err != null)
              console.log('ERROR:%s', err)
              //TO DO: if error that row exists then do update
        })
      }
  })
}

function handleGatewayMessage(topic, message) {
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
      case 'listnew':
        listNodes(false)
        break
      case 'listall':
        listNodes(false)
        break
      case 'updateHRFHJsk':
        fs.open('./.updatenow', "wx", function (err, fd) {
          // handle error
          fs.close(fd, function (err) {
            // handle error
            if (err)
            {
              client.publish('system/gateway', 'previous update in progress', {qos: 0, retain: false})
            }
            else
            {
              client.publish('system/gateway', 'updating', {qos: 0, retain: false})
              const child = execFile('./gateway-update.sh', [''], (error, stdout, stderr) => {
                if (error)
                {
                  client.publish('system/gateway', 'update error', {qos: 0, retain: false})
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
    client.publish('system/login/'+msg.username, '{"md5": "'+userMD5+'"}', {qos: 0, retain: false})
    client.subscribe(userMD5+'/in')
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
      case 'createBuilding':
        createBuilding(userTopic, msg.id, msg.parameters)
        break
      case 'createFloorForBuilding':
        createFloorForBuilding(userTopic, msg.id, msg.parameters)
        break
      case 'createRoomForFloor':
        createRoomForFloor(userTopic, msg.id, msg.parameters)
        break
      case 'listBuildings':
        listBuildings(userTopic, msg.id)
        break
      case 'listFloorsForBuilding':
        listFloorsForBuilding(userTopic, msg.id, msg.parameters)
        break
      case 'listRoomsForFloor':
        listRoomsForFloor(userTopic, msg.id, msg.parameters)
        break
      case 'listUnusedNodes':
        listUnusedNodes(userTopic, msg.id, msg.parameters)
        break
      case 'attachNodeToRoom':
        attachNodeToRoom(userTopic, msg.id, msg.parameters)
        break
      case 'removeNodeFromRoom':
        removeNodeFromRoom(userTopic, msg.id, msg.parameters)
        break
      case 'getNodeContacts':
        getNodeContacts(userTopic, msg.id, msg.parameters)
        break
      case 'listNodesForRoom':
        listNodesForRoom(userTopic, msg.id, msg.parameters)
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
    client.publish('user/login/'+msg.username, '{"md5": "'+userMD5+'"}', {qos: 0, retain: false})
    client.subscribe('user/'+userMD5+'/in')
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
                  client.subscribe(message+'/set')
                  client.unsubscribe(oldTopic+'/set')
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

function listNodes(listall) {
    NodeDB.find({ "contact.message.mqtt" : { $exists: true } }, function (err, entries) {
      if (!err)
      {
        if (entries.length > 0)
        {
          for (var n=0; n<entries.length; n++)
          {
            var dbNode = entries[n]
            for (var c=0; c<dbNode.contact.length; c++)
            {
              for (var m=0; m<dbNode.contact[c].message.length; m++)
              {
                if (listall || !dbNode.contact[c].message[m].mqtt)
                {
                  var newJSON = '{"nodeid": '+dbNode._id+', "contactid": '+dbNode.contact[c].id+', "contacttype": '+dbNode.contact[c].type+', "msgtype": '+dbNode.contact[c].message[m].type+', "value": "'+dbNode.contact[c].message[m].value+'", "mqtt": "'+dbNode.contact[c].message[m].mqtt+'"}'
                  console.log('%s', newJSON)
                  client.publish('system/node', newJSON, {qos: 0, retain: false})
//                  serial.write(dbNode._id + ';' + dbNode.contact[c].id + ';1;1;' + dbNode.contact[c].message[m].type + ';' + message + '\n', function () { serial.drain(); });
                }
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

function listBuildings(userTopic, id) {
  BuildingDB.find({ "building" : { $exists: true } }, function (err, entries) {
    if (entries.length > 0)
    {
      var listJSON='['
      for (var n=0; n<entries.length; n++)
      {
        listJSON = listJSON + '{"name":"'+entries[n].building+'", "id":"'+entries[n].id+'"}'
        if (n<entries.length-1)
          listJSON += ","
      }
      listJSON += ']'
      var newJSON = '{"id": "'+id+'", "payload": '+listJSON+'}'
      client.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
  })
}

// - listFloorsForBuilding => ["floor1", "floor2", "outside"]
function listFloorsForBuilding(userTopic, id, par) {
  BuildingDB.find({ id : parseInt(par.building_id) }, function (err, entries) {
    if (entries.length == 1)
    {
      var listJSON='['
      for (var f=0; f<entries[0].floor.length; f++)
      {
        listJSON = listJSON + '{"name":"'+entries[0].floor[f].name+'", "id":"'+entries[0].floor[f].id+'"}'
        if (f<entries[0].floor.length-1)
          listJSON += ","
      }
      listJSON += ']'
      var newJSON = '{"id": "'+id+'", "payload": '+listJSON+'}'
      client.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
  })
}

// - listRoomsForFloor => ["guestroom", "bedroom"]
function listRoomsForFloor(userTopic, id, par) {
  BuildingDB.find({ "floor.id": parseInt(par.floor_id) }, function (err, entries) {
    if (entries.length == 1)
    {
      for (var f=0; f<entries[0].floor.length; f++)
      {
        if (entries[0].floor[f].id == parseInt(par.floor_id))
        {
          var listJSON='['
          for (var r=0; r<entries[0].floor[f].room.length; r++)
          {
            // listJSON = listJSON + '"' + entries[0].floor[f].room[r].name + '"'
            listJSON = listJSON + '{"name":"'+entries[0].floor[f].room[r].name+'", "id":"'+entries[0].floor[f].room[r].id+'"}'
            if (r<entries[0].floor[f].room.length-1)
              listJSON += ","
          }
          listJSON += ']'
          var newJSON = '{"id": "'+id+'", "payload": '+listJSON+'}'
          client.publish(userTopic, newJSON, {qos: 0, retain: false})
        }
      }
    }
  })
}

// - listNodesForRoom => ["1", "23"]
function listNodesForRoom(userTopic, id, par) {
  BuildingDB.find({ "floor.room.id": parseInt(par.room_id) }, function (err, entries) {
    if (entries.length == 1)
    {
      var listJSON='['
      for (var f=0; f<entries[0].floor.length; f++)
      {
        for (var r=0; r<entries[0].floor[f].room.length; r++)
        {
          if (entries[0].floor[f].room[r].id == parseInt(par.room_id))
          {
            for (var n=0; n<entries[0].floor[f].room[r].node.length; r++)
            {
              listJSON = listJSON + '{"nodeid":"'+entries[0].floor[f].room[r].node[n].id+'"}'
              if (n<entries[0].floor[f].room[r].node.length-1)
                listJSON += ","
            }
          }
        }
      }
      listJSON += ']'
      var newJSON = '{"id": "'+id+'", "payload": '+listJSON+'}'
      client.publish(userTopic, newJSON, {qos: 0, retain: false})
    }
  })
}

// - listAttachedNodesForRoom => ["temp", "hum","trv"]
function createBuilding(userTopic, id, par) {
  BuildingDB.find({ building : par.building }, function (err, entries) {
    if (entries.length == 1)
    {
      var newJSON = '{"id": "'+id+'", "payload": "Building already exists"}'
      client.publish(userTopic, newJSON, {qos: 0, retain: false})
      return
    }
    BuildingDB.getAutoId(function (err, autoid) {
      // console.log('id: %s', autoid)
      dbBuilding = new Object()
      dbBuilding.building = this.par.building
      dbBuilding.id = autoid
      dbBuilding.floor = new Array()
      var newJSON = '{"id": "'+this.id+'", "payload": "building_id": "'+autoid+'"}'
      BuildingDB.insert(dbBuilding, function (err, newEntry) {
        if (!err)
        {
          // var newJSON = '{"id": "'+id+'", "payload": "building_id:'+autoid+'"}'
          client.publish(this.userTopic, this.newJSON, {qos: 0, retain: false})
        }
        else
        {
          console.log('ERROR:%s', err)
        }
      }.bind({newJSON: newJSON, userTopic: userTopic}))
    }.bind({par: par, userTopic: userTopic, id: id}))
  })
}

function createFloorForBuilding(userTopic, id, par) {
  // console.log('Is building id:%s', par.building_id)
  BuildingDB.find({ id : parseInt(par.building_id) }, function (err, entries) {
    if (entries.length == 1)
    {
      for (var f=0; f<entries[0].floor.length; f++)
      {
        if (entries[0].floor[f].name == par.floor)
        {
              var newJSON = '{"id": "'+id+'", "payload": "Floor already exists"}'
              client.publish(userTopic, newJSON, {qos: 0, retain: false})
              return
        }
      }
      BuildingDB.getAutoId(function (err, autoid) {
        var newFloor = new Object()
        newFloor.name = par.floor
        newFloor.id = autoid
        newFloor.room = new Array()
        var updateCon = {$push:{}}   
        updateCon.$push["floor"] = newFloor
        BuildingDB.update({ id: parseInt(par.building_id) }, updateCon )
        var newJSON = '{"id": "'+id+'", "payload": "floor_id": "'+autoid+'"}'
        client.publish(userTopic, newJSON, {qos: 0, retain: false})
      })
    }
  })
}

function createRoomForFloor(userTopic, id, par) {
  BuildingDB.find({ "floor.id": parseInt(par.floor_id) }, function (err, entries) {
    if (entries.length > 0)
    {
      var dbBuilding = entries[0]
      // console.log('flr cnt :%s', dbBuilding.floor.length)
      for (var f=0; f<dbBuilding.floor.length; f++)
      {
        if (dbBuilding.floor[f].id == parseInt(par.floor_id))
        {
          // console.log('flr id :%s', dbBuilding.floor[f].id)
          for (var r=0; r<dbBuilding.floor[f].room.length; r++)
          {
            if (dbBuilding.floor[f].room[r].name == par.room)
            {
              var newJSON = '{"id": "'+id+'", "payload": "Room already exists"}'
              client.publish(userTopic, newJSON, {qos: 0, retain: false})
              return
            }
          }
          BuildingDB.getAutoId(function (err, autoid) {
            var newRoom = new Object()
            newRoom.name = par.room
            newRoom.id = autoid
            newRoom.node = new Array()
            var updateCon = {$push:{}}
            updateCon.$push["floor."+this.f+".room"] = newRoom
            BuildingDB.update({ "floor.id": parseInt(par.floor_id) }, updateCon )
            var newJSON = '{"id": "'+id+'", "payload": "room_id": "'+autoid+'"}'
            client.publish(userTopic, newJSON, {qos: 0, retain: false})
          }.bind({f:f}))
        }
      }
    }
  })
}

// - listUnusedNodes => {[id:2,name:node_name,versio:1.0], [id:3,name:node_name,versio:2.1]}
function listUnusedNodes(userTopic, id, par) {
  NodeDB.find({ name: { $exists: true }}, function (err, entries) {
    if (!err)
    {
      var newJSON = '[';
      for (var n in entries) {
        var dbNode = entries[n]
        BuildingDB.find({ "floor.room.node.id": dbNode._id }, function (err, entries) {
          if (!err)
          {
            if (entries.length == 0 && this.dbNode._id && this.dbNode.name && this.dbNode.version)
            {
              //found unlisted node
              if (newJSON.length)
                 newJSON += ', '
              newJSON = newJSON + '{"id": "'+this.dbNode._id+'", "name": "'+this.dbNode.name+'", "version": "'+this.dbNode.version+'""}'
            }
            if (this.nodesLeft == 0)
            {
               newJSON += ']'
               newJSON = '{"id": "'+id+'", "payload": "'+newJSON+'"}'
               client.publish(userTopic, newJSON, {qos: 0, retain: false})
            }
          }
        }.bind({dbNode: dbNode, nodesLeft: entries.length-n-1}))
      }
    }
  })
}

// - attachNodeToRoom
function attachNodeToRoom(userTopic, id, par) {
  BuildingDB.find({ "floor.room.id": parseInt(par.room_id) }, function (err, entries) {
    for (var n=0; n<entries.length; n++)
    {
      var dbBuilding = entries[n]
      for (var f=0; f<dbBuilding.floor.length; f++)
      {
          for (var r=0; r<dbBuilding.floor[f].room.length; r++)
          {
            if (dbBuilding.floor[f].room[r].id == parseInt(par.room_id))
            {
              var newNode = new Object()
              newNode.id = par.nodeid
              // newNode.contact = new Array()
              // newNode.contact[0] = new Object()
              // newNode.contact[0].id = 2
              // newNode.contact[0].message = 36

              var updateCon = {$push:{}}
              updateCon.$push["floor."+f+".room."+r+".node"] = newNode
              BuildingDB.update({ "floor.room.id": parseInt(par.room_id) }, updateCon )
              var newJSON = '{"id": "'+id+'", "payload": "OK"}'
              client.publish(userTopic, newJSON, {qos: 0, retain: false})
            }
          }
      }
    }
  })
}

// - removeNodeToRoom
function removeNodeFromRoom(userTopic, id, par) {
  BuildingDB.find({ "floor.room.id": parseInt(par.room_id) }, function (err, entries) {
    for (var n=0; n<entries.length; n++)
    {
      var dbBuilding = entries[n]
      for (var f=0; f<dbBuilding.floor.length; f++)
      {
          for (var r=0; r<dbBuilding.floor[f].room.length; r++)
          {
            if (dbBuilding.floor[f].room[r].id == parseInt(par.room_id))
            {
              var removeNode = new Object()
              removeNode.id = par.nodeid

              var updateCon = {$pull:{}}
              updateCon.$pull["floor."+f+".room."+r+".node"] = removeNode
              BuildingDB.update({ "floor.room.id": parseInt(par.room_id) }, updateCon )
              var newJSON = '{"id": "'+id+'", "payload": "OK"}'
              client.publish(userTopic, newJSON, {qos: 0, retain: false})
            }
          }
      }
    }
  })
}

// - getNodeContacts => [{id:"2", type:6}, {id:"3", type: 8}]
function getNodeContacts(userTopic, id, par) {
  NodeDB.find({ _id : par.nodeid }, function (err, entries) {
    if (!err)
    {
      if (entries.length > 0)
      {
        for (var n=0; n<entries.length; n++)
        {
          var dbNode = entries[n]
          var newJSON = '{"id":"'+id+'", "payload": ['
          for (var c=0; c<dbNode.contact.length; c++)
          {
            for (var m=0; m<dbNode.contact[c].message.length; m++)
            {
              newJSON += '{"contactid": "'+dbNode.contact[c].id+'", "contacttype": "'+dbNode.contact[c].type+'"}'
              if (m < dbNode.contact[c].message.length-1 || c < dbNode.contact.length-1)
                newJSON += ', '
              // console.log('%s', newJSON)
            }
          }
          newJSON += ']}'
          client.publish(userTopic, newJSON, {qos: 0, retain: false})
        }
      }
    }
  })
}

// - composeNodeForRoomFromNode // e.g. crete temp sensor for unused temp sensor
// - getNodeContacts => ["2", "3"]
// - getNodeContactType => ["29", "1"]
// - getNodeContactValue => ["22.3"]


//on startup do something
