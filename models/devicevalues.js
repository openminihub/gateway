'use strict';
module.exports = (sequelize, DataTypes) => {
  const DeviceValues = sequelize.define('DeviceValues', {
    node_id: DataTypes.STRING,
    device_id: DataTypes.STRING,
    devicetype_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    place_id: DataTypes.INTEGER,
    messages: DataTypes.STRING
  }, {});
  DeviceValues.associate = function(models) {
    // associations can be defined here
  };
  return DeviceValues;
};