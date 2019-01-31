var Influx = require('influx')

var msgStorage = [
    {float:  [0,1,4]},
    {int:    [3,6]},
    {bool:   [2]},
    {string: [5]}    
]

module.exports = {

    enable: () => {

        const influx = new Influx.InfluxDB({
            host: 'localhost',
            database: 'openminihub',
            schema: [
                {
                    measurement: 'devicemessages',
                    tags: [
                        'node_id',
                        'device_id',
                        'devicetype_id',
                        'messagetype_id'
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
                        .then(result => {
                            // influx.createContinuousQuery
                            // influx.createRetentionPolicy
                        })
                }
            })
            .catch(err => {
                console.error(`Error creating Influx database!`)
            })
    },

    writePoints: (message) => {
        _message.value
        influx.writePoints([
            {
                measurement: 'devicemessages',
                tags: { node_id: message.node_id, device_id: message.device_id, messagetype_id: message.messagetype_id },
                fields: {
                    msgvalue: msgvalue,
                    msgdata: msgdata
                }
            }
        ]).catch(error => {
            console.error(`Error saving data to InfluxDB: ${error.message}`)
        })
    }

}