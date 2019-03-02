'use strict';
module.exports = (sequelize, DataTypes) => {
  const AutomationRules = sequelize.define('AutomationRules', {
    automation_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Automations',
        key: "id"
      }
    },
    type: DataTypes.STRING(1),
    platform: DataTypes.STRING,
    devicemessage_id: DataTypes.INTEGER,
    operator: DataTypes.STRING,
    value: DataTypes.STRING,
    initvalue: DataTypes.STRING
  }, {
      // indexes: [
      //   {
      //     name: 'automationrule_idx',
      //     unique: true,
      //     fields: ['id']
      //   }
      // ]
    });
  AutomationRules.associate = function (models) {
    // associations can be defined here
  };
  return AutomationRules;
};