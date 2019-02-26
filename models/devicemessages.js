'use strict';
module.exports = (sequelize, DataTypes) => {
  const DeviceMessages = sequelize.define('DeviceMessages', {
    node_id: {
      type: DataTypes.STRING,
      references: {
        model: 'Devices',
        key: "node_id"
      }
    },
    device_id: {
      type: DataTypes.STRING,
      references: {
        model: 'Devices',
        key: "id"
      }
    },
    messagetype_id: DataTypes.INTEGER,
    value: DataTypes.STRING,
    prevvalue: DataTypes.STRING,
    rssi: DataTypes.INTEGER
  }, {
    indexes: [
      {
        name: 'message_idx',
        unique: true,
        fields: ['node_id', 'device_id', 'type']
      }
    ]
  });
  DeviceMessages.associate = function(models) {
    // associations can be defined here
    // models.Messages.belongsTo(models.Devices, { targetKey: 'node_id', foreignKey: 'node_id' })
    // models.Messages.belongsTo(models.Devices, { targetKey: 'device_id', foreignKey: 'device_id' })
  };
  return DeviceMessages;
};