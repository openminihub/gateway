
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Views = sequelize.define('Views', {
    name: DataTypes.STRING
  }, {});
  Views.associate = function(models) {
    // associations can be defined here
  };
  return Places;
};