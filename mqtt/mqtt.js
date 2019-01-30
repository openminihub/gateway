var mqtt = require('mqtt')
var debug = require('debug')('mqtt')
const api = require('../api')
const ESPurna = require('../devices/espurna.js')
//ONLY FOR DEVELOPMENT
const OpenNode = require('../devices/opennode.js')


exports.enable = function (config) {
    debug('Connectig to MQTT: %o', config.cloud.name)
    var mqttCloud = mqtt.connect('mqtt://' + config.cloud.name + ':' + config.cloud.port, { username: config.cloud.username, password: config.cloud.password })
    var mqttLocal = mqtt.connect('mqtt://' + config.local.name + ':' + config.local.port, { username: config.local.username, password: config.local.password })

    mqttCloud.on('connect', () => {
        //on startup subscribe to user topics
        mqttCloud.subscribe('user/+/in')
        //ONLY FOR DEVELOPMENT
        mqttCloud.subscribe('serial')
        console.log('+connection to cloud mqtt OK')
    })

    mqttLocal.on('connect', () => {
        //on startup subscribe to all OpenNode topics
        console.log('==============================');
        console.log('* Subscribing to MQTT topics *');
        console.log('==============================');
        // var mqttTopic = 'node/' + entries[n].nodeid + '/' + entries[n].deviceid + '/' + entries[n].msgtype + '/set'
        // mqttLocal.subscribe(mqttTopic)
        // console.log('%s', mqttTopic);
        console.log('==============================');

        //system configuration topics
        mqttLocal.subscribe('system/gateway')
        // mqttLocal.subscribe('user/login')
        // mqttLocal.subscribe('system/login')
        // mqttLocal.subscribe('gateway/in')
        mqttLocal.subscribe('system/node/?/?/?/set')
        mqttLocal.subscribe('user/+/in')
        mqttLocal.subscribe('gateway/node/+/out')
        // ESPURNA Handlers
        mqttLocal.subscribe('espurna/+/+')
        mqttLocal.subscribe('espurna/+/+/+')
        console.log('+connection to local mqtt OK')
    })

    mqttCloud.on('message', (topic, message) => {
        return parseMqttMessage(topic, message, 'cloud')
    })

    mqttLocal.on('message', (topic, message) => {
        return parseMqttMessage(topic, message, 'local')
    })
}

function parseMqttMessage(topic, message, source) {
    var _message = message.toString('utf8').replace(/\s+/g, ' ').trim()
    console.log('MQTT < %s %s', topic, _message)
    if (_message.length === 0) {
        return false
    }
    var topic = topic.split('/')
    switch (topic[0]) {
        case 'user':
            debug('User: %s', topic[1])
            try {
                var _json_message = JSON.parse(_message)
                // _json_message.topic = topic
                _json_message.source = source
                debug('ALL: %o', _json_message)
                return api[_json_message.cmd](_json_message, topic[1], api.respondUser)
            }
            catch (err) {
                console.log('No handler for command %o', _json_message.cmd)
                // console.log(err)
            }
            break
        // return handleUserMessage(topic, message)
        case 'system':
            switch (topic[1]) {
                case 'gateway':
                // return handleGatewayMessage(topic, message)
                // case 'node':
                // return handleNodeMessage(topic, message)
                default:
                    return false
            }
            break
        case 'gateway':
        // return handleGatewayMessage(topic, message)
        case 'node':
        // return handleSendMessage(topic, message)
        case 'espurna':
            debug('ESPurna MSG')
            return ESPurna.processMqttData(topic, message)
            break
        // return handleOutTopic(topic + '/' + message, 'ESPurna')
        case 'serial':
            debug('Serial Development')
            return OpenNode.processSerialData(message)
            break
        case 'user':
        default:
            return false
    }
    console.log('No handler for topic %s', topic[0])
}