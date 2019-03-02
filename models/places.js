'use strict';
module.exports = (sequelize, DataTypes) => {
  const Places = sequelize.define('Places', {
    parent_id: DataTypes.INTEGER,
    name: DataTypes.STRING
  }, {});
  Places.associate = function(models) {
    // associations can be defined here
  };
  return Places;
};