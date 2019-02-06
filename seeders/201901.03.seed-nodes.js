'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Nodes', [
      {
        id: 'GATEWAY',
        version: '1.0.0',
        board: 'GATEWAY',
        type: 'Gateway',
        name: 'Gateway',
        ip: null,
        battery: 100,
        createdAt: new Date().toDateString(),
        updatedAt: new Date().toDateString()
      }
    ], {})
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Nodes', null, {})
  }
}