'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
  return queryInterface.createTable('Messages', {
    id: {
      allowNull: true,
      type: Sequelize.INTEGER
    },
    node_id: {
      primaryKey: true,
      type: Sequelize.STRING
      // ,
      // references: {
      //   model: 'Devices',
      //   key: 'node_id'
      // }
    },
    device_id: {
      primaryKey: true,
      type: Sequelize.STRING
      // ,
      // references: {
      //   model: 'Devices',
      //   key: 'id'
      // }
    },
    messagetype_id: {
      primaryKey: true,
      type: Sequelize.INTEGER
      , references: {
        model: 'MessageTypes',
        key: 'id'
      }
    },
    value: {
      type: Sequelize.STRING
    },
    rssi: {
      allowNull: false,
      defaultValue: 0,
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
    // queryInterface.sequelize.query('ALTER TABLE "Messages" ADD CONSTRAINT devices_fk FOREIGN KEY (node_id, device_id) REFERENCES Devices(node_id, device_id);')
    return queryInterface.addIndex('Messages', ['node_id', 'device_id', 'messagetype_id'], { indexName: 'messages_pk', indicesType: 'UNIQUE' })
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


// return queryInterface.sequelize.query('CREATE TABLE `Messages` (\
//   `id` INTEGER, \
//   `node_id` VARCHAR(255) NOT NULL, \
//   `device_id` VARCHAR(255) NOT NULL, \
//   `type` INTEGER NOT NULL, \
//   `value` VARCHAR(255), \
//   `rssi` INTEGER, \
//   `createdAt` DATETIME NOT NULL, \
//   `updatedAt` DATETIME NOT NULL, \
//   PRIMARY KEY (`node_id`, `device_id`, `type`), \
//   FOREIGN KEY (node_id, device_id) REFERENCES Nodes(node_id, device_id));'
// )
