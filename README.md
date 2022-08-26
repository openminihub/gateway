# OpenMiniHub gateway V2 - MQTT gateway for IoT

**OpenMiniHub gateway V2 is an opensource IoT MQTT gateway for RaspberryPi**

## Features:
- Full gateway and node control with [MQTT API V2](https://github.com/openminihub/gateway/wiki/API-documention-v2)
- Supports [OpenNode](https://github.com/openminihub/OpenNode)
- Supports [ESPurna](https://github.com/xoseperez/espurna)
- Partly compatible with [MySensors.org Serial API v2](https://www.mysensors.org/download/serial_api_20)
- Compatible with [LowPowerLab RFM96 library](https://github.com/LowPowerLab/RFM69)
- Possibility to use local and cloud MQTT broker and easily switch between them
- Written in NODE.JS
- Wireless node update using RFM69_OTA
- SQLite3 storage of node configuration and data
- [Sequelize](https://github.com/sequelize/sequelize) for easy switch between databases & database change version control
- Automatic gateway update
- Data history stored in InlfuxDB
- Lightweight - runs on Raspberry PI Zero
- Self installing script & automatic update from GIT if new version is commited
- The main concept is user friendly and usable by non IT persons (iOS application)
  
## Details & Setup Guide
The full details of how to install this gateway will be published on [web](http://openminihub.com/gateway).

## Quick setup reference
- Do a `git clone https://github.com/openminihub/gateway.git` in `/home/pi` or copy the contents of this directory in `/home/pi/gateway`
- Run `bash ./gateway/setup/setup.sh` to setup the gateway and install all dependencies
- Adjust any settings if needed in `config/gateway.json` or do it with iOS APP
- Connect a GatewayNode to your Pi through the GPIO serial port or USB. The default configured serial port in settings.json5 is `dev/serial0` (GPIO serial port)

## License
This source code is released under GPL 3.0 with the following ammendment:<br/>
You are free to use, copy, distribute and transmit this Software for non-commercial purposes.
For more details see [LICENSE](https://github.com/OpenMiniHub/gateway/LICENSE)

## Credits
[Martins Ierags](http://openminihub.com/contact)
