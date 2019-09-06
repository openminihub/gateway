'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AutomationActions', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      automation_id: {
        type: Sequelize.INTEGER
        , references: {
            model: 'Automations',
            key: 'id'
         }
        },
      type: {
        type: Sequelize.STRING
      },
      devicemessage_id: {
        type: Sequelize.INTEGER
      },
      value: {
        type: Sequelize.STRING
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
      return queryInterface.addIndex('AutomationActions', ['id'], {indexName: 'automationactions_pk', indicesType: 'UNIQUE'})
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AutomationActions');
  }
};