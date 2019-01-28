'use strict';
module.exports = (sequelize, DataTypes) => {
  const Messages = sequelize.define('Messages', {
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
    type: DataTypes.INTEGER,
    value: DataTypes.STRING,
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
  Messages.associate = function(models) {
    // associations can be defined here
    // models.Messages.belongsTo(models.Devices, { targetKey: 'node_id', foreignKey: 'node_id' })
    // models.Messages.belongsTo(models.Devices, { targetKey: 'device_id', foreignKey: 'device_id' })
  };
  return Messages;
};