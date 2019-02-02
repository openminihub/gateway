const mqtt = require('../mqtt')
var fs = require('fs')
const execFile = require('child_process').execFile
var path = require('path')
var debug = require('debug')('system')

module.exports = {

    updateGateway: (msg, respond) => {
        fs.readFile(path.join(__dirname, '/.updatenow'), function (err, data) {
            //TO DO: handle old file
            if (!err) {
                return respond({ message: "Previous update in progress" }, msg, 0)
            }
            else {
                debug(path.join(__dirname, '../.updatenow'))
                fs.writeFile(path.join(__dirname, '../.updatenow'), 'user/' + msg.user + '/out' + '\n' + msg.id + '\n' + msg.source + '\n', function (err) {
                    if (!err) {
                        const child = execFile(path.join(__dirname, '../gateway-update.sh'), [''], (err, stdout, stderr) => {
                            if (!err) {
                                // return { message: "Starting gateway update..." }
                                return respond({ message: "Starting gateway update..." }, msg, 0)

                            }
                            else {
                                fs.unlink(path.join(__dirname, '../.updatenow'), function (err) {
                                    if (err) console.log('Error deleting GW update lockfile!')
                                })
                                // return { message: "Problem executing gateway update" }
                                return respond({ message: "Problem executing gateway update" }, msg, 0)

                            }
                            console.log(stdout)
                        })
                    }
                    else {
                        return respond({ message: err.toString() }, msg, 0)
                    }
                })
            }
        })
    },

    isStartupAfterUpdate: () => {
        fs.readFile(path.join(__dirname, '../.updatedone'), 'utf8', function read(err, data) {
            if (!err) {
                var filecontent = data
                lines = filecontent.split('\n')
                if (lines.length > 3) {
                    console.log('Gateway startup after update: %s', lines[3])
                    var msg = new Object()
                    msg.user = lines[0]
                    msg.id = parseInt(lines[1])
                    msg.source = lines[2]
                    mqtt.respondUser({ message: lines[3] }, msg, 1)
                }
                fs.unlink(path.join(__dirname, '../.updatedone'), function (err) {
                    if (err) console.log('Error deleting GW update.done lockfile!')
                });
            }
            else {
                // console.log('* Gateway startup without update')
            }
        })
    },

    controlGateway: (msg, respond) => {
        const { exec } = require('child_process')
        exec((par.sudo) ? "sudo " + par.cmd : par.cmd, (err, stdout, stderr) => {
            var answer = new Object()
            var result = 0
            if (!err) {
                result = 1
                answer = { message: stdout.trim() }
            }
            else {
                answer = { message: stderr }
                payload.push({ message: stderr })
            }
            return respond(answer, msg, result)
        })
    }


}