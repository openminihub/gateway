'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Nodes', [
      {
        id: '5',
        version: '1.0.1',
        board: 'DHT22-Light',
        type: 'OpenNode',
        name: 'DHT22-Light',
        ip: null,
        battery: 100,
        createdAt: new Date().toDateString(),
        updatedAt: new Date().toDateString()
      }, {
        id: '6',
        version: '1.0.1',
        board: 'Garage',
        type: 'OpenNode',
        name: 'Garage',
        ip: null,
        battery: 100,
        createdAt: new Date().toDateString(),
        updatedAt: new Date().toDateString()
      }, {
        id: '7',
        version: '1.0.1',
        board: 'DHT22-Light',
        type: 'OpenNode',
        name: 'DHT22-Light',
        ip: null,
        battery: 100,
        createdAt: new Date().toDateString(),
        updatedAt: new Date().toDateString()
      }
    ], {});
},
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Nodes', null, {});
  }
};