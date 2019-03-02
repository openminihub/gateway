'use strict';
module.exports = (sequelize, DataTypes) => {
  const Automations = sequelize.define('Automations', {
    name: DataTypes.STRING,
    enabled: DataTypes.BOOLEAN,
    timefrom: DataTypes.DATE,
    timetill: DataTypes.DATE,
    weekdays: DataTypes.STRING
  }, {
    indexes: [
      {
        name: 'automation_idx',
        unique: true,
        fields: ['id']
      }
    ]
  });
  Automations.associate = function(models) {
    // associations can be defined here
  };
  return Automations;
};