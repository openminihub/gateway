'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Devices', {
      node_id: {
        // allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING,
        references: {
          model: 'Nodes',
          key: 'id'
        }
      },
      id: {
        primaryKey: true,
        type: Sequelize.STRING
      },
      devicetype_id: {
        type: Sequelize.INTEGER
        , references: {
          model: 'DeviceTypes',
          key: 'id'
        }
        },
      name: {
        type: Sequelize.STRING
      },
      place_id: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
      .then(() => {
        return queryInterface.addIndex('Devices', ['node_id', 'id'], {indexName: 'devices_pk', indicesType: 'UNIQUE'})
      })
    },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Devices');
  }
};