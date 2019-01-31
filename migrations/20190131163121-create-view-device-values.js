'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(
'select d.node_id, d.id as device_id, d.devicetype_id, d.name, d.place_id, dm.messages \
from Devices d, \
(select m.node_id, m.device_id, \'[\'||group_concat(\'{messagetype_id:\'||messagetype_id||\', value:\'||value||\', rssi:\'||rssi||\', updatedAt:\'||updatedAt||\'}\')||\']\' as messages \
from Messages m \
group by m.node_id, m.device_id) dm \
where dm.node_id = d.node_id and dm.device_id = d.id;'
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('DROP VIEW DeviceValues;')
  }
};
