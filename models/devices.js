'use strict';
module.exports = (sequelize, DataTypes) => {
  const Devices = sequelize.define('Devices', {
    // device: DataTypes.STRING,
    // node_id: DataTypes.STRING,
    node_id: {
      type: DataTypes.STRING,
      references: {
        model: 'Nodes',
        key: "id"
      }
    },
    devicetype_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    place_id: DataTypes.INTEGER,
    config: DataTypes.STRING
}, {
    indexes: [
      {
        name: 'device_idx',
        unique: true,
        fields: ['node_id', 'id']
      }
    ]
  })
  Devices.associate = function (models) {
    // associations can be defined here
    // db.Devices.belongsTo(db.Messages, { targetKey: 'device_id', foreignKey: 'id' })
  }

  return Devices
}