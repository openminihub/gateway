# Martins Ierags / OpenMiniHub / 2018
#
GW_CHANGE_CNT=`git diff origin/development --name-only | grep -v "firmware/" | wc -l`
CHANGE_LOG=`git log HEAD..origin/development --oneline`
OPENNODE_CHANGE=`git diff origin/development --name-only | grep "firmware/OpenNode" | awk -F"/" '{print $NF}'`

for opennode in ${OPENNODE_CHANGE}; do
    opennode_json=`echo $opennode | awk -F"_" '{print "{ \"name\" : \"" $1 "\", \"version\" : \"" substr($2,1,length($2)-4 ) "\" }" }'`
    opennode_list="${opennode_list:+$opennode_list, }$opennode_json"
done

if [ $GW_CHANGE_CNT -gt 0 ]; then
    GW_CHANGE="true"
else
    GW_CHANGE="false"
fi


echo "{"
echo "\"gw\" : ${GW_CHANGE},"
echo "\"opennode\" : ["
echo ${opennode_list}
echo "],"
echo "\"log\" : \"$(echo ${CHANGE_LOG} | awk -v ORS='\\n' '1')\""
echo "}"
