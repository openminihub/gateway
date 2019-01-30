'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('DeviceTypes', {
      id: {
        allowNull: false,
        // autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type: {
        allowNull: false,
        type: Sequelize.STRING
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      },
      messages: {
        type: Sequelize.STRING
      },
      createdAt: {
        // allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        // allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    })
    .then(() => {
      return queryInterface.addIndex('DeviceTypes', ['id'], {indexName: 'devicetypes_pk', indicesType: 'UNIQUE'})
    })
},
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('DeviceTypes');
  }
};