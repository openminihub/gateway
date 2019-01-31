# OpenMiniHub Gateway API
List of API commands
* [createPlace](#createplace-\--create-the-new-place) - Create the new Place
* [listPlaces](#listplaces-\--list-the-places) - List the Places
* [listDevices](#listdevices-\--list-devices) - List Devices
* [listNodes](#listnodes-\--get-list-of-nodes) - Get list of nodes

### To call API commands you must provide:
| Property   | Type    | Description                             |
| ---------- | ------- | --------------------------------------- |
| ID         | Integer | Command ID                              |
| CMD        | String  | Command name                            |
| PARAMETERS | Array   | List of parameters required for command |

### Command _OUTPUT_ will return:
| Property | Type    | Description                     |
| -------- | ------- | ------------------------------- |
| ID       | Integer | Command ID                      |
| RESULT   | Integer | Command result [0-false,1-true] |
| PAYLOAD  | Array   | List of payload                 |

## createPlace - Create the new Place
#### IN:  parameters :
| Property  | Type   | Description     | Optional? |
| --------- | ------ | --------------- | --------- |
| name      | String | Place name      |
| parent_id | String | Parent place ID | YES       |
#### OUT: payload :
| Property  | Type   | Description     |
| --------- | ------ | --------------- |
| id        | String | Place ID        |
| name      | String | Place name      |
| parent_id | String | Parent place ID |

## listPlaces - List the Places
#### IN:  parameters :
| Property | Type     | Description              | Optional? |
| -------- | -------- | ------------------------ | --------- |
| parentid | String[] | Array of parent place ID | YES       |
#### OUT: payload[] :
| Property | Type     | Description                           |
| -------- | -------- | ------------------------------------- |
| name     | String   | Place name                            |
| parentid | String   | Parent place ID                       |
| devices  | String[] | Array of devices ID attached to place |
| id       | String   | Place ID                              |

## removePlace - Remove the Place
#### IN:  parameters :
| Property | Type     | Description                 | Optional? |
| -------- | -------- | --------------------------- | --------- |
| id       | String[] | Array of place ID to remove |
#### OUT: payload :
| Property | Type   | Description |
| -------- | ------ | ----------- |
| message  | String | Message     |

## renamePlace - Rename the Place
#### IN:  parameters :
| Property | Type   | Description        | Optional? |
| -------- | ------ | ------------------ | --------- |
| id       | String | Place ID to rename |
| name     | String | Place name to set  |
#### OUT: payload :
| Property | Type   | Description |
| -------- | ------ | ----------- |
| message  | String | Message     |

## listDevices - list devices
#### IN: parameters :
| Property   | Type      | Description                                                                                                 | Optional? |
| ---------- | --------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| devicetype | Integer[] | Array of device types                                                                                       | YES       |
| placeid    | String[]  | Array of place ID <br/>__null__ - to get not assigned devices <br/> __"all"__ - to get all assigned devices | YES       |
#### OUT: payload[]:
| Property | Sub-property | Type    | Description                       | Optional? |
| -------- | ------------ | ------- | --------------------------------- | --------- |
| id       |              | Integer | Device id in node                 |
| type     |              | Integer | Device type                       |
| name     |              | String  | Device name                       |
| placeid  |              | String  | Place ID where device is assigned | YES       |
| nodeid   |              | String  | Node ID                           |

## renameDevice - Rename the Device
#### IN:  parameters :
| Property | Type    | Description         | Optional? |
| -------- | ------- | ------------------- | --------- |
| id       | Integer | Device ID to rename |
| nodeid   | String  | Node ID to rename   |
| name     | String  | Device name to set  |
#### OUT: payload :
| Property | Type   | Description |
| -------- | ------ | ----------- |
| message  | String | Message     |

## listDeviceTypes - List defined device types
#### IN: parameters :
| Property | Type      | Description           | Optional? |
| -------- | --------- | --------------------- | --------- |
| types    | Integer[] | Array of device types | YES       |
#### OUT: payload:
| Property | Type    | Description                  |
| -------- | ------- | ---------------------------- |
| name     | String  | Device type description/name |
| value    | String  | Device type value definition |
| type     | Integer | Device type                  |

## listMessageTypes - List device message types
#### IN: parameters :
| Property | Type      | Description                   | Optional? |
| -------- | --------- | ----------------------------- | --------- |
| types    | Integer[] | Array of device message types | YES       |
#### OUT: payload:
| Property | Type    | Description                          |
| -------- | ------- | ------------------------------------ |
| name     | String  | Device message type description      |
| value    | String  | Device message type value definition |
| type     | Integer | Device message type                  |

## listNodes - Get list of nodes
#### IN:  none
#### OUT: payload[] :
| Property  | Sub-property | Type   | Description                       | Optional? |
| --------- | ------------ | ------ | --------------------------------- | --------- |
| type      |              | String | Node type (OpenNode / ESP)        |
| name      |              | String | Node name                         |
| board     |              | String | Node firmware name                |
| version   |              | String | Node firmware version             |
| devices[] |              | Array  | Array of node devices             |
|           | id           | String | Device ID                         |
|           | type         | String | Device type                       |
|           | name         | String | Device name                       | YES       |
|           | placeid      | String | Place ID where device is assigned | YES       |
| id        |              | String | node ID                           |

