#!/bin/bash
# Usage:
#   ./gateway-node-update.sh

dir_to_update=$PWD
gateway_log=~/gateway/logs/gateway.sys.log
avrdude_log=~/gateway/logs/avrdude.log
FW="${dir_to_update}/firmware/gateway.ino.hex"
FW_CURR="${dir_to_update}/.gwnodefw"

if [ -f "$FW_CURR" ] ; then
    FW_OLD=`cat ${FW_CURR}`
else
    FW_OLD=0
fi

if [ -f "${dir_to_update}/.updatenow" ] ; then
    gwupdate="done"
    if [ -f "$FW" ] ; then
      FW_NEW=`md5sum $FW | awk '{ print $1 }'`
      if [ "$FW_NEW" != "$FW_OLD" ] ; then
        echo "Flashing GW Node with latest firmware" >> $gateway_log
        ./utility/avrdude -v -c arduino -p atmega328p -P /dev/serial0 -b 115200 -U flash:w:$FW -l $avrdude_log
	if [ `grep 'Reading\|Writing' ${avrdude_log} | grep '100%' | wc -l` -ne 3 ] ; then 
          gwupdate="failed"
        else
          echo "${FW_NEW}" > ${FW_CURR}
	fi
        cat $avrdude_log >> $gateway_log
	rm -f $avrdude_log
      fi
    fi
    mv ${dir_to_update}/.updatenow ${dir_to_update}/.updatedone
    echo "Gateway update ${gwupdate}" >> ${dir_to_update}/.updatedone
    echo "OpenMiniHub gateway has been updated" >> $gateway_log
else
    echo "Update not initiated from APP"
fi
