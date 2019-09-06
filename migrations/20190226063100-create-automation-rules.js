'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AutomationRules', {
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
      platform: {
        type: Sequelize.STRING
      },
      devicemessage_id: {
        type: Sequelize.INTEGER
      },
      operator: {
        type: Sequelize.STRING
      },
      value: {
        type: Sequelize.STRING
      },
      prevvalue: {
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
      return queryInterface.addIndex('AutomationRules', ['id'], {indexName: 'automatoinrules_pk', indicesType: 'UNIQUE'})
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AutomationRules')
  }
}