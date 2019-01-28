'use strict';
module.exports = (sequelize, DataTypes) => {
  const Nodes = sequelize.define('Nodes', {
    version: DataTypes.STRING,
    board: DataTypes.STRING,
    type: DataTypes.INTEGER,
    name: DataTypes.STRING,
    ip: DataTypes.STRING,
    battery: DataTypes.REAL
  }, {});
  Nodes.associate = function(models) {
    // associations can be defined here
  };
  return Nodes;
};