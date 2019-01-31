// const mqtt = require('../mqtt')
var fs = require('fs')
const execFile = require('child_process').execFile

module.exports = {

    updateGateway: (msg) => {
        fs.readFile('./.updatenow', function (err, data) {
            //TO DO: handle old file
            if (!err) {
                return { message: "Previous update in progress" }
            }
            else {
                fs.writeFile('./.updatenow', 'user/' + msg.user + '/out' + '\n' + msg.id + '\n', function (err) {
                    if (!err) {
                        const child = execFile('./gateway-update.sh', [''], (err, stdout, stderr) => {
                            if (!err) {
                                return { message: "Starting gateway update..." }
                            }
                            else {
                                fs.unlink('./.updatenow', function (err) {
                                    if (err) console.log('Error deleting GW update lockfile!')
                                })
                                return { message: "Problem executing gateway update" }
                            }
                            console.log(stdout)
                        })
                    }
                })
            }
        })
    }

}