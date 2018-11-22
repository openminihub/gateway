#!/bin/bash
# Usage:
#   ./gateway-update.sh

dir_to_update=$PWD
gateway_log=~/gateway/logs/gateway.sys.log
avrdude_log=~/gateway/logs/avrdude.log
FW="${dir_to_update}/firmware/gateway.ino.hex"
FW_CURR="${dir_to_update}/.gwnodefw"

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
echo "${FW_OLD}" > ${FW_CURR}

if [ -f "${dir_to_update}/.updatenow" ] ; then
    updateRepo $dir_to_update >> $gateway_log
    echo "Update DONE. Restarting gateway.service" >> $gateway_log
    sudo systemctl restart gateway.service
else
    echo "Update not initiated from APP"
fi
