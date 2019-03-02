'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Automations', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      enabled: {
        type: Sequelize.BOOLEAN
      },
      timefrom: {
        type: Sequelize.DATE
      },
      timetill: {
        type: Sequelize.DATE
      },
      weekdays: {
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
      return queryInterface.addIndex('Automations', ['id'], {indexName: 'automations_pk', indicesType: 'UNIQUE'})
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Automations')
  }
}