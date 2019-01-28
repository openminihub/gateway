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
   return queryInterface.bulkInsert('Devices', [{
    device: '1',
    node_id: '5',
    type: 2,
    name: 'Temperatūra',
    place_id: null,
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString()
  }, {
    device: '2',
    node_id: '5',
    type: 1,
    name: 'Mitrums',
    place_id: null,
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString()
  }, {
    device: '1',
    node_id: '6',
    type: 1,
    name: 'Vārti',
    place_id: null,
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
   return queryInterface.bulkDelete('Devices', null, {});
  }
};
