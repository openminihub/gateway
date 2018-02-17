sudo mkdir /opt/node
mkdir ~/sources
cd ~/sources
wget https://nodejs.org/dist/v6.9.1/node-v6.9.1-linux-armv6l.tar.xz
tar -xvf node-v6.9.1-linux-armv6l.tar.xz
sudo cp -r node-v6.9.1-linux-armv6l/* /opt/node/
cd ~/gateway
/opt/node/bin/npm install
