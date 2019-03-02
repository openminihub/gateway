'use strict';
module.exports = (sequelize, DataTypes) => {
  const AutomationActions = sequelize.define('AutomationActions', {
    automation_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Automations',
        key: "id"
      }
    },
    devicemessage_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    value: DataTypes.STRING
  }, {
      // indexes: [
      //   {
      //     name: 'automationrule_idx',
      //     unique: true,
      //     fields: ['id']
      //   }
      // ]
    });
    AutomationActions.associate = function (models) {
    // associations can be defined here
  };
  return AutomationActions;
};