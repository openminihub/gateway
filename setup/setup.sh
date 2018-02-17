#!/bin/bash
mkdir ../logs
sudo cp ./logrotate /etc/logrotate.d/gateway
sudo cp ./gateway.service /etc/systemd/system/gateway.service
sudo systemctl daemon-reload
sudo systemctl start gateway.service
sudo systemctl enable gateway.service
