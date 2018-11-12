#!/bin/bash
# Usage:
#   ./gateway-update.sh

dir_to_update=$PWD
gateway_log=~/gateway/logs/gateway.sys.log
FW="${dir_to_update}/firmware/gateway.ino.hex"

updateRepo() {
    local dir="$dir_to_update"
    cd $dir # switch to the git repo
    repo_url=$(git config --get remote.origin.url)

    echo "****************************************************************************"
    echo "Updating Repo: $dir with url: $repo_url"
    echo "Starting update in $PWD"

    # reseting the local changes and update the repo
    echo -e "\nExecuting: git fetch & reset"
    (git fetch --all && git reset --hard origin/development)

    echo ""
}

if [ -f "$FW" ] ; then
  FW_OLD=`md5sum $FW | awk '{ print $1 }'`
else
  FW_OLD=0
fi

if [ -f "${dir_to_update}/.updatenow" ] ; then
    echo "Updating ${dir_to_update}"
    updateRepo $dir_to_update >> $gateway_log
    mv ${dir_to_update}/.updatenow ${dir_to_update}/.updatedone
    echo "Gateway update done" >> ${dir_to_update}/.updatedone
    echo "OpenMiniHub gateway has been updated" >> $gateway_log
    echo "Stopping gateway.service" >> $gateway_log
    sudo systemctl kill gateway.service
    if [ -f "$FW" ] ; then
      FW_NEW=`md5sum $FW | awk '{ print $1 }'`
      if [ "$FW_NEW" != "$FW_OLD" ] ; then
        echo "Updating GW NODE..." >> $gateway_log
        ./utility/avrdude -v -c arduino -p atmega328p -P /dev/serial0 -b 115200 -U flash:w:$FW > $gateway_log
      else
        echo "No GW NODE update this time" > $gateway_log
      fi
    fi
    echo "Starting gateway.service" >> $gateway_log
    sudo systemctl start gateway.service
else
    echo "Update not initiated from APP"
fi
