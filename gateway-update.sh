#!/bin/bash
# Usage:
#   ./gateway-update.sh

dir_to_update=$PWD
gateway_log=~/gateway/logs/gateway.sys.log
avrdude_log=~/gateway/logs/avrdude.log

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

if [ -f "${dir_to_update}/.updatenow" ] ; then
    SERVICE_VERSION_OLD=`md5sum "${dir_to_update}/setup/gateway.service" | awk '{ print $1 }'`
    updateRepo $dir_to_update >> $gateway_log
    SERVICE_VERSION_NEW=`md5sum "${dir_to_update}/setup/gateway.service" | awk '{ print $1 }'`
    if [ "$SERVICE_VERSION_NEW" != "$SERVICE_VERSION_OLD" ] ; then
        echo "Updating gateway.service daemon service" >> $gateway_log
        sudo cp ${dir_to_update}/setup/gateway.service /etc/systemd/system/
        sudo systemctl daemon-reload
    fi
    echo "Update DONE. Restarting gateway.service" >> $gateway_log
    sudo systemctl restart gateway.service
else
    echo "Update not initiated from APP"
fi
