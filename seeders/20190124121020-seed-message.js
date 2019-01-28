'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkInsert('People', [{
        name: 'John Doe',
        isBetaMember: false
      }], {});
    */
    return queryInterface.bulkInsert('Messages', [{
      node_id: '5',
      device: '1',
      device_id: 1,
      type: 1,
      value: '21.0',
      rssi: -70,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      node_id: '5',
      device: '2',
      device_id: 2,
      type: 0,
      value: '43.0',
      rssi: -75,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      node_id: '6',
      device: '1',
      device_id: 3,
      type: 47,
      value: '0',
      rssi: -72,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      node_id: '6',
      device: '1',
      device_id: 3,
      type: 13,
      value: '1',
      rssi: -71,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }], {});
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
    return queryInterface.bulkDelete('Messages', null, {});
  }
};
