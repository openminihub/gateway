'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.sequelize.query('CREATE TRIGGER TRG_AU_Node_default_name \
                                    AFTER UPDATE ON "Nodes" \
                                    FOR EACH ROW \
                                    WHEN OLD.name IS NULL \
                                      AND NEW.board IS NOT NULL \
                                    BEGIN \
                                        UPDATE "Nodes" \
                                        SET name = NEW.board \
                                        WHERE rowid = NEW.rowid; \
                                    END;')
    return queryInterface.sequelize.query('CREATE TRIGGER TRG_AI_Node_default_name \
                                          AFTER INSERT ON "Nodes" \
                                          FOR EACH ROW \
                                          WHEN NEW.board IS NOT NULL \
                                          BEGIN \
                                              UPDATE "Nodes" \
                                              SET name = NEW.board \
                                              WHERE rowid = NEW.rowid; \
                                          END;')
  },
  down: (queryInterface, Sequelize) => {
    queryInterface.sequelize.query('DROP TRIGGER TRG_AU_Node_default_name;')
    return queryInterface.sequelize.query('DROP TRIGGER TRG_AI_Node_default_name;')
  }
};