#########################################################################
#  Gateway setup script for RaspberryPi
#########################################################################
#!/bin/bash

RED='\033[1;31m'
GRN='\033[1;32m'
YLW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

GATEWAY_DIR='/home/pi/gateway'

echo -e "${GRN}#########################################################################${NC}"
echo -e "${GRN}#                    OpenMiniHub Gateway Setup                          #${NC}"
echo -e "${GRN}#########################################################################${NC}"
echo -e "${YLW}Note: script can take long on older Pis${NC}"
echo -e "${YLW}Note: setup requires your input at certain steps${NC}"

echo -e "${CYAN}************* STEP: Running apt-get update *************${NC}"
sudo apt-get update -m
echo -e "${CYAN}************* STEP: Upgrading distribution *************${NC}"
sudo apt-get upgrade
echo -e "${CYAN}************* STEP: Running dist-upgrade *************${NC}"
sudo apt-get dist-upgrade
sudo apt-get clean

echo -e "${CYAN}************* STEP: Installing git, minicon *************${NC}"
sudo apt-get -y install git minicom

echo -e "${CYAN}************* STEP: Installing avrdude, python-rpi.gpio *************${NC}"
sudo apt-get install -y avrdude python python-rpi.gpio

echo -e "${CYAN}************* STEP: Installing Mosquitto MQTT *************${NC}"
sudo apt-get -y install mosquitto mosquitto-clients

echo -e "${CYAN}************* STEP: Installing InfluxDB *************${NC}"
sudo apt install apt-transport-https
curl -sL https://repos.influxdata.com/influxdb.key | sudo apt-key add -
codename=$(lsb_release -a|grep "Codename:"|awk -F':' '{print $2}')
echo "deb https://repos.influxdata.com/debian ${codename} stable" | sudo tee /etc/apt/sources.list.d/influxdb.list
sudo apt update
sudo apt-get install influxdb
sudo systemctl start influxdb

#install NodeJS
echo -e "${CYAN}************* STEP: Installing NodeJS *************${NC}"
sudo wget -O - https://raw.githubusercontent.com/audstanley/NodeJs-Raspberry-Pi/master/Install-Node.sh | sudo bash

echo -e "${CYAN}************* STEP: Setup Gateway app & dependencies *************${NC}"
mkdir -p $GATEWAY_DIR    #main dir where gateway app lives
cd $GATEWAY_DIR || exit
git init
git remote add origin https://github.com/openminihub/gateway.git
git pull origin develop
sudo npm install --unsafe-perm --build-from-source --ignore-warnings
sudo npm cache verify    #clear any caches/incomplete installs
sudo npm audit fix
mkdir $GATEWAY_DIR/log -p
if [ ! -f $GATEWAY_DIR/config/gateway.json ]; then
  cp -p gateway.sample.json gateway.json
fi

#create db and empty placeholders so chown pi will override root permissions
mkdir $GATEWAY_DIR/data -p

#create influxdb database
influx <<EOD
create database openminihub
EOD

#create self signed certificate
#WARNING: must do this *AFTER* the gateway app was git-cloned
echo -e "${CYAN}************* STEP: Create self signed HTTPS certificate (5 year) *************${NC}"
mkdir $GATEWAY_DIR/ssl -p
sudo openssl req -new -x509 -nodes -days 1825 -newkey rsa:2048 -out $GATEWAY_DIR/ssl/server.crt -keyout $GATEWAY_DIR/ssl/server.key -subj "/C=LV/L=Marupe/O=OpenMiniHub/OU=IoT/CN=openminihub.com"

#fix owenrship issues if they exists
sudo chown -R pi:pi $GATEWAY_DIR

echo -e "${CYAN}************* STEP: Disable GPIO serial console *************${NC}"
sudo raspi-config nonint do_serial 1

echo -e "${CYAN}************* STEP: Enable GPIO serial port *************${NC}"
sudo sed -i -e 's/enable_uart=0/enable_uart=1/g' -e 'enable_uart=1' /boot/config.txt

echo -e "${CYAN}************* STEP: Swtich GPIO serial port to PL011 *************${NC}"
echo "dtoverlay=pi3-miniuart-bt"|sudo tee -a /boot/config.txt

echo -e "${CYAN}************* STEP: Configuring logrotate *************${NC}"
sudo echo "#this is used by logrotate and should be placed in /etc/logrotate.d/
#rotate the gateway logs and keep a limit of how many are archived
#note: archives are rotated in $GATEWAY_DIR/logs so that dir must exist prior to rotation
$GATEWAY_DIR/log/*.log {
        size 20M
        missingok
        rotate 20
        dateext
        dateformat -%Y-%m-%d
        compress
        notifempty
        nocreate
        copytruncate
}" | sudo tee /etc/logrotate.d/gateway

echo -e "${CYAN}************* STEP: Setup Gateway service ... *************${NC}"
sudo cp $GATEWAY_DIR/setup/gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gateway.service
sudo systemctl start gateway.service

echo -e "${RED}! Important : ${YLW}If not done already - configure your Pi core settings (timezone, expand SD etc) by running ${GRN}raspi-config${NC}"
echo -e "${CYAN}************* STEP: Run raspi-config *************${NC}"
if (whiptail --title "Run raspi-config ?" --yesno "Would you like to run raspi-config?" 12 78) then
  sudo raspi-config
fi

echo -e "${CYAN}************* ALL DONE! *************${NC}"
cd ~/
exit 0
