#!/bin/bash
# Usage:
#   ./gateway-update.sh.sh [parent_directory]
#   example usage:
#       ./gateway-update.sh /home/pi/gateway

updateRepo() {
    local dir="$1"
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

dir_to_update=${1}
log_dir=~/gateway/logs/gateway.sys.log

if [ -z "$dir_to_update" ] ; then
    dir_to_update=$PWD
fi

if [ -f "${dir_to_update}/.updatenow" ] ; then
    echo "Updating ${dir_to_update}"
    updateRepo $dir_to_update >> $log_dir
    mv ${dir_to_update}/.updatenow ${dir_to_update}/.updatedone
    echo "Gateway update done" >> ${dir_to_update}/.updatedone
    echo "OpenMiniHub gateway has been updated" >> $log_dir
    echo "Restarting gateway.service" >> $log_dir
    sudo systemctl restart gateway.service
else
    echo "Update not initiated from APP"
fi
