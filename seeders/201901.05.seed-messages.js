'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Messages', [
      {
      node_id: '5',
      device_id: '1',
      messagetype_id: 1,
      value: '21.0',
      rssi: -70,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      node_id: '5',
      device_id: '2',
      messagetype_id: 0,
      value: '43.0',
      rssi: -75,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      node_id: '6',
      device_id: '1',
      messagetype_id: 47,
      value: '0',
      rssi: -72,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      node_id: '6',
      device_id: '1',
      messagetype_id: 13,
      value: '1',
      rssi: -71,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }
  ], {});
},

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Messages', null, {});
  }
};
