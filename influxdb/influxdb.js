var Influx = require('influx')
var influx

module.exports = {

    enable: () => {

        influx = new Influx.InfluxDB({
            host: 'localhost',
            database: 'openminihub',
            schema: [
                {
                    measurement: 'devicemessages',
                    tags: [
                        'node_id',
                        'device_id',
                        // 'devicetype_id',
                        'messagetype_id'
                    ],
                    fields: {
                        value: Influx.FieldType.FLOAT
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

    writeValue: (message) => {
        try {
            var _flt_value = parseFloat(message.value)
            influx.writePoints([
                {
                    measurement: 'devicemessages',
                    tags: { node_id: message.node_id, device_id: message.device_id, messagetype_id: message.messagetype_id },
                    fields: {
                        value: _flt_value
                    }
                }
            ]).catch(error => {
                console.error(`Error saving data to InfluxDB: ${error.message}`)
                return false
            })
        }
        catch (err) {
            return false
        }
        return true
    }

}