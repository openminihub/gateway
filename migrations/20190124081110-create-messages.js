'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      node_id: {
        type: Sequelize.STRING
        references: {
          model: 'Nodes',
          key: 'id'
        }
      },
      device_id: {
        type: Sequelize.INTEGER
        references: {
          model: 'Devices',
          key: 'id'
        }
      },
      device: {
        type: Sequelize.STRING
        references: {
          model: 'Devices',
          key: 'device'
        }
      },
      type: {
        type: Sequelize.INTEGER
      },
      value: {
        type: Sequelize.STRING
      },
      rssi: {
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
    // .then(() => {
    //   return queryInterface.sequelize.query('ALTER TABLE "Nodes" ADD CONSTRAINT "nodes_pk" PRIMARY KEY ("node_id", "device_id", "type")');
    // })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Messages');
  }
};