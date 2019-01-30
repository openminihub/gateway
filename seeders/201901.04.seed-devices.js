'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Devices', [
      {
      id: '1',
      node_id: '5',
      devicetype_id: 2,
      name: 'Temperatūra',
      place_id: null,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      id: '2',
      node_id: '5',
      devicetype_id: 1,
      name: 'Mitrums',
      place_id: null,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }, {
      id: '1',
      node_id: '6',
      devicetype_id: 1,
      name: 'Vārti',
      place_id: null,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    }
  ], {});
},

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Devices', null, {});
  }
};
