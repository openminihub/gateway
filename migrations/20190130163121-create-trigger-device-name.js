'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(
'CREATE TRIGGER TRG_AI_Device_default_name \
AFTER INSERT ON "Devices" \
FOR EACH ROW \
WHEN NEW.devicetype_id IS NOT NULL \
BEGIN \
    UPDATE "Devices" \
    SET name = (select devicetypes.name from devicetypes where devicetypes.id = NEW.devicetype_id)\
    WHERE rowid = NEW.rowid; \
END;'
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('DROP TRIGGER TRG_AI_Device_default_name;')
  }
};
