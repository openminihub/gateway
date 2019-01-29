'use strict';
module.exports = (sequelize, DataTypes) => {
  const Nodes = sequelize.define('Nodes', {
    version: DataTypes.STRING,
    board: DataTypes.STRING,
    type: DataTypes.INTEGER,
    name: DataTypes.STRING,
    ip: DataTypes.STRING,
    battery: DataTypes.REAL
  }, {
    indexes: [
      {
        name: 'node_idx',
        unique: true,
        fields: ['id']
      }
    ]
  });
  Nodes.associate = function(models) {
    // associations can be defined here
  };
  return Nodes;
};