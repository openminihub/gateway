'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
      //   // primaryKey: true,
        type: Sequelize.INTEGER
      },
      node_id: {
        primaryKey: true,
        type: Sequelize.STRING,
        references: {
          model: 'Nodes',
          key: 'id'
        }
      },
      device_id: {
        primaryKey: true,
        type: Sequelize.STRING,
        references: {
          model: 'Devices',
          key: 'id'
        }
      },
      type: {
        primaryKey: true,
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
    .then(() => {
      return queryInterface.addIndex('Messages', ['node_id', 'device_id', 'type'], {indexName: 'messages_pk', indicesType: 'UNIQUE'})
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Messages');
  }
};

// queryInterface.addConstraint('Messages', ['node_id', 'device_id', 'type'], {
//   type: 'primary key',
//   name: 'messages_pk'
// })