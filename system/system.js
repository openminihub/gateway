// const mqtt = require('../mqtt')
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
                fs.writeFile(path.join(__dirname, '../.updatenow'), 'user/' + msg.user + '/out' + '\n' + msg.id + '\n', function (err) {
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
    }

}