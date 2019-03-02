'use strict';
module.exports = (sequelize, DataTypes) => {
  const MessageTypes = sequelize.define('MessageTypes', {
    type: DataTypes.STRING,
    name: DataTypes.STRING,
    ro: DataTypes.BOOLEAN
  }, {
    indexes: [
      {
        name: 'messagetype_id_idx',
        unique: true,
        fields: ['id']
      },
      {
        name: 'messagetype_type_idx',
        unique: true,
        fields: ['type']
      }
    ]
  });
  MessageTypes.associate = function(models) {
    // associations can be defined here
  };
  return MessageTypes;
};