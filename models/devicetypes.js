'use strict';
module.exports = (sequelize, DataTypes) => {
  const DeviceTypes = sequelize.define('DeviceTypes', {
    type: DataTypes.STRING,
    name: DataTypes.STRING,
    messages: DataTypes.STRING
  }, {
    indexes: [
      {
        name: 'devicetype_id_idx',
        unique: true,
        fields: ['id']
      },
      {
        name: 'devicetype_type_idx',
        unique: true,
        fields: ['type']
      }
    ]
  });
  DeviceTypes.associate = function(models) {
    // associations can be defined here
  };
  return DeviceTypes;
};