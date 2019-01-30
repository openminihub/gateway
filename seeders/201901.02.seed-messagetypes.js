'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('MessageTypes',
      [ { id: 0, type: 'V_TEMP', name: 'Temperature', ro: false }
      , { id: 1, type: 'V_HUM', name: 'Humidity', ro: false }
      , { id: 2, type: 'V_STATUS', name: 'Status', ro: true }
      , { id: 3, type: 'V_PERCENTAGE', name: 'Percentage value 0-100 (%)', ro: false }
      , { id: 4, type: 'V_PRESSURE', name: 'Atmospheric Pressure', ro: false }
      , { id: 5, type: 'V_FORECAST', name: 'Whether forecast', ro: false }
      , { id: 6, type: 'V_RAIN', name: 'Amount of rain', ro: false }
      , { id: 7, type: 'V_RAINRATE', name: 'Rate of rain', ro: false }
      , { id: 8, type: 'V_WIND', name: 'Wind speed', ro: false }
      , { id: 9, type: 'V_GUST', name: 'Gust', ro: false }
      , { id: 10, type: 'V_DIRECTION', name: 'Wind direction 0-360 (degrees)', ro: false }
      , { id: 11, type: 'V_UV', name: 'UV light level', ro: false }
      , { id: 12, type: 'V_WEIGHT', name: 'Weight', ro: false }
      , { id: 13, type: 'V_DISTANCE', name: 'Distance', ro: false }
      , { id: 14, type: 'V_IMPEDANCE', name: 'Impedance', ro: false }
      , { id: 15, type: 'V_ARMED', name: 'Armed', ro: true }
      , { id: 16, type: 'V_TRIPPED', name: 'Tripped', ro: false }
      , { id: 17, type: 'V_WATT', name: 'Power in W', ro: false }
      , { id: 18, type: 'V_KWH', name: 'Accumulated number of KWH for a power meter', ro: false }
      , { id: 19, type: 'V_SCENE_ON', name: 'Turn on a scene', ro: true }
      , { id: 20, type: 'V_SCENE_OFF', name: 'Turn of a scene', ro: true }
      , { id: 21, type: 'V_HVAC_FLOW_STATE', name: 'HVAC flow state (Off, HeatOn, CoolOn, or AutoChangeOver)', ro: true }
      , { id: 22, type: 'V_HVAC_SPEED', name: 'HVAC speed', ro: true }
      , { id: 23, type: 'V_LIGHT_LEVEL', name: 'Uncalibrated light level. 0-100 (%)', ro: false }
      , { id: 24, type: 'V_VAR1', name: 'VAR1', ro: true }
      , { id: 25, type: 'V_VAR2', name: 'VAR2', ro: true }
      , { id: 26, type: 'V_VAR3', name: 'VAR3', ro: true }
      , { id: 27, type: 'V_VAR4', name: 'VAR4', ro: true }
      , { id: 28, type: 'V_VAR5', name: 'VAR5', ro: true }
      , { id: 29, type: 'V_UP', name: 'Window covering. Up', ro: true }
      , { id: 30, type: 'V_DOWN', name: 'Window covering. Down', ro: true }
      , { id: 31, type: 'V_STOP', name: 'Window covering. Stop', ro: true }
      , { id: 32, type: 'V_IR_SEND', name: 'Send out an IR-command', ro: true }
      , { id: 33, type: 'V_IR_RECEIVE', name: 'This message contains a received IR-command', ro: false }
      , { id: 34, type: 'V_FLOW', name: 'Flow of water (in meter)', ro: false }
      , { id: 35, type: 'V_VOLUME', name: 'Water volume', ro: true }
      , { id: 36, type: 'V_LOCK_STATUS', name: 'Set or get lock status. 1=Locked', ro: true }
      , { id: 37, type: 'V_LEVEL', name: 'Level', ro: true }
      , { id: 38, type: 'V_VOLTAGE', name: 'Voltage', ro: false }
      , { id: 39, type: 'V_CURRENT', name: 'Current', ro: false }
      , { id: 40, type: 'V_RGB', name: 'RGB value', ro: true }
      , { id: 41, type: 'V_RGBW', name: 'RGBW value. Sent as ASCII hex: RRGGBBWW', ro: true }
      , { id: 42, type: 'V_ID', name: 'Used for sending in sensors hardware ids (i.e. OneWire DS1820b)', ro: false }
      , { id: 43, type: 'V_UNIT_PREFIX', name: 'Allows sensors to send in a string representing the unit prefix to be displayed in GUI', ro: false }
      , { id: 44, type: 'V_HVAC_SETPOINT_COOL', name: 'HVAC cool setpoint', ro: true }
      , { id: 45, type: 'V_HVAC_SETPOINT_HEAT', name: 'HVAC heat setpoint', ro: true }
      , { id: 46, type: 'V_HVAC_FLOW_MODE', name: 'Flow mode for HVAC (Auto, On, Off, Frost, Periodic)', ro: true }
      , { id: 47, type: 'V_TEXT', name: 'Text message to display on LCD or controller device', ro: true }
      , { id: 48, type: 'V_CUSTOM', name: 'Custom messages used for controller/inter node specific commands', ro: true }
      , { id: 49, type: 'V_POSITION', name: 'GPS position and altitude. Payload: latitude;longitude;altitude(m)', ro: false }
      , { id: 50, type: 'V_IR_RECORD', name: 'Record IR codes S_IR for playback', ro: true }
      , { id: 51, type: 'V_PH', name: 'Water quality: PH', ro: false }
      , { id: 52, type: 'V_ORP', name: 'Water quality: : ORP', ro: false }
      , { id: 53, type: 'V_EC', name: 'Water quality: EC', ro: false }
      , { id: 54, type: 'V_VAR', name: 'Power sensor VAR', ro: true }
      , { id: 55, type: 'V_VA', name: 'Power sensor VA', ro: false }
      , { id: 56, type: 'V_POWER_FACTOR', name: 'Power factor', ro: false }
      , { id: 57, type: 'V_GATE_STATUS', name: 'Gate status (OPENED, CLOSED, OPENING, CLOSING, PAUSED)', ro: true }
      , { id: 58, type: 'V_GATE_STATE', name: 'Control gate state (OPEN, CLOSE, PAUSE)', ro: true }
      ],
      {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('MessageTypes', null, {});
  }
};
