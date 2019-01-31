# OpenMiniHub Gateway API
List of API commands
* [createPlace](#createplace-\--create-the-new-place) - Create the new Place
* [removePlace](#removeplace-\--remove-the-place) - Delete the place
* [renamePlace](#renameplace-\--rename-the-place) - Rename the place
* [listPlaces](#listplaces-\--list-the-places) - List the Places
* [listDevices](#listdevices-\--list-devices) - List Devices
* [renameDevice](#renamedevice-\--rename-the-device) - Rename the device
* [listDeviceTypes](#listdevicetypes-\--list-defined-device-types) - List defined device types
* [listMessageTypes](#listmessagetypes-\--list-device-message-types) - List device message types
* [listNodes](#listnodes-\--get-list-of-nodes) - Get list of nodes
* [renameNode](#renamenode-\--rename-the-node) - Rename the node
* [listActions](#listactions-\--get-list-of-actions) - Get list of actions
* [createAction](#createaction-\--create-the-new-action) - Create the new action
* [updateAction](#updateaction-\--update-the-action) - Update the action
* [updateGateway](#updategateway-\--update-gateway-software-from-git-repo) - update Gateway software from git repo
* [controlGateway](#controlgateway-\--execute-command-on-gateway) - Execute command on gateway
* [getDeviceValues](#getdevicevalues-\--get-requested-device-latest-values) - Get requested device latest values
* [getDeviceValueHistory](#getdevicevaluehistory-\--get-device-value-history) - Get requested device value history
* [setDeviceValue](#setdevicevalue-\--set-device-value) - Set device value
* [attachDeviceToPlace](#attachdevicetoplace-\--attach-the-device-to-the-place) - Attach the device to the Place
* [detachDeviceFromPlace](#detachdevicefromplace-\--detach-the-device-from-the-place) - Detach the device from the Place
* [subscribeForDeviceMessages](#subscribefordevicemessages-\--subscribe-for-device-messages) - Subscribe for device messages
* [listSubscribedDevices](#listsubscribeddevices-\--list-subscribed-devices) - List subscribed devices
* [getNodeUpdateVersion](#getnodeupdateversion-\--get-node-newest-available-firmware-version) - Get node newest available firmware version
* [nodeUpdate](#nodeupdate-\--update-node-with-newest-available-firmware-version) - Update node with newest available firmware version
* [getUpdateInfo](#getupdateinfo-\--get-update-information) - Get update information

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
| Property | Type   | Description     | Optional? |
| -------- | ------ | --------------- | --------- |
| name     | String | Place name      |
| parentid | String | Parent place ID | YES       |
#### OUT: payload :
| Property | Type   | Description |
| -------- | ------ | ----------- |
| id       | String | Place ID    |

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

## renameNode - Rename the Node
#### IN:  parameters :
| Property | Type   | Description       | Optional? |
| -------- | ------ | ----------------- | --------- |
| id       | String | Node ID to rename |
| name     | String | Node name to set  |
#### OUT: payload :
| Property | Type   | Description |
| -------- | ------ | ----------- |
| message  | String | Message     |

## listActions - Get list of actions
#### IN:  none
#### OUT: payload[] :
| Property   | Sub-property | Type    | Description           |
| ---------- | ------------ | ------- | --------------------- |
| name       |              | String  | Action name           |
| enabled    |              | Boolean | Enable/disable action |
| rules[]    |              | Array   | Array of rules        |
| type       |              | String  | Rule type             |
| definition |              | String  | Rule definition       |
| actions[]  |              | Array   | Array of actions      |
| type       |              | String  | Action type           |
| var        |              | String  | Node device           |
| value      |              | String  | Value to set          |
| id         |              | String  | node ID               |

## createAction - Create the new action
#### IN: parameters[] :
| Property  | Sub-property | Type    | Description           |
| --------- | ------------ | ------- | --------------------- |
| name      |              | String  | Action name           |
| enabled   |              | Boolean | Enable/disable action |
| rules[]   |              | Array   | Array of rules        |
|           | type         | String  | Rule type             |
|           | definition   | String  | Rule definition       |
| actions[] |              | Array   | Array of actions      |
|           | type         | String  | Action type           |
|           | var          | String  | Node device           |
|           | value        | String  | Value to set          |
#### OUT: payload:
| Property | Type   | Description                   |
| -------- | ------ | ----------------------------- |
| message  | String | Status about executed command |

## updateAction - Update the action
#### IN: parameters[] :
| Property  | Sub-property | Type    | Description           | Optional |
| --------- | ------------ | ------- | --------------------- | -------- |
| id        |              | String  | Action ID             |
| name      |              | String  | Action name           | Yes      |
| enabled   |              | Boolean | Enable/disable action | Yes      |
| rules[]   |              | Array   | Array of rules        | Yes      |
|           | type         | String  | Rule type             |
|           | definition   | String  | Rule definition       |
| actions[] |              | Array   | Array of actions      | Yes      |
|           | type         | String  | Action type           |
|           | var          | String  | Node device           |
|           | value        | String  | Value to set          |
#### OUT: payload:
| Property | Type   | Description                   |
| -------- | ------ | ----------------------------- |
| message  | String | Status about executed command |

## updateGateway - update Gateway software from git repo
#### IN: none
#### OUT: payload:
| Property | Type   | Description                    |
| -------- | ------ | ------------------------------ |
| message  | String | Status about GW update process |

## controlGateway - Execute command on gateway
#### IN: parameters[] :
| Property | Type    | Description        |
| -------- | ------- | ------------------ |
| sudo     | Boolean | Use 'sudo'         |
| cmd      | String  | Command to execute |
#### OUT: payload:
| Property | Type   | Description                   |
| -------- | ------ | ----------------------------- |
| message  | String | Status about executed command |

## getDeviceValues - Get requested device latest values
#### IN: parameters[] :
| Property | Type    | Description | Optional? |
| -------- | ------- | ----------- | --------- |
| nodeid   | String  | Node ID     | YES       |
| deviceid | Integer | Device ID   | YES       |
#### OUT: payload[] :
| Property   | Sub-propery | Type    | Description             |
| ---------- | ----------- | ------- | ----------------------- |
| nodeid     |             | String  | Node ID                 |
| deviceid   |             | Integer | Device id               |
| devicetype |             | Integer | Device type             |
| devicename |             | String  | Device name             |
| messages   |             | Array[] | List of device messages |
|            | msgtype     | Integer | Message type            |
|            | msgvalue    | Float   | Message value           |
|            | msgdata     | String  | Message data            |
|            | updated     | Integer | Last update timestamp   |
|            | rssi        | Integer | Signal strnegth         |
|            | id          | String  | Message ID              |

## getDeviceValueHistory - Get device value history)
#### IN: parameters :
| Property   | Type    | Description                           | Optional |
| ---------- | ------- | ------------------------------------- | -------- |
| nodeid     | String  | Node ID                               |
| deviceid   | Integer | Device id                             |
| msgtype    | Integer | Message type                          |
| offsetfrom | String  | Offset (0, 1m, 1h, 1d, 1w, ...)       |
| offsetto   | String  | Offset (0, 1m, 1h, 1d, 1w, ...)       |
| resolution | String  | Data resolution (1m, 1h, 1d, 1w, ...) | Yes      |
#### OUT: payload []:
| Property | Type  | Description                    |
| -------- | ----- | ------------------------------ |
| time     | Time  | Unix timestamp                 |
| msgvalue | Float | Requested device message value |

## setDeviceValue - Set device value
#### IN: parameters[] :
| Property   | Type    | Description   |
| ---------- | ------- | ------------- |
| nodeid     | String  | Node ID       |
| deviceid   | Integer | Device id     |
| devicetype | Integer | Device type   |
| msgtype    | Integer | Message type  |
| msgvalue   | Float   | Message value |
| msgdata    | String  | Message data  |
#### OUT: payload:
|     | Property | Type   | Description                            |     |
| --- | -------- | ------ | -------------------------------------- | --- |
|     | message  | String | Status about device attaching to place |     |

## attachDeviceToPlace - Attach the device to the Place
#### IN: parameters :
| Property | Type    | Description | Optional? |
| -------- | ------- | ----------- | --------- |
| nodeid   | String  | Node ID     | YES       |
| deviceid | Integer | Device ID   | YES       |
| placeid  | String  | Place ID    | YES       |
#### OUT: payload:
| Property | Type   | Description                            |
| -------- | ------ | -------------------------------------- |
| message  | String | Status about device attaching to place |

## detachDeviceFromPlace - Detach the device from the Place
#### IN: parameters :
| Property | Type    | Description | Optional? |
| -------- | ------- | ----------- | --------- |
| nodeid   | String  | Node ID     | YES       |
| deviceid | Integer | Device ID   | YES       |
#### OUT: payload:
| Property | Type   | Description                               |
| -------- | ------ | ----------------------------------------- |
| message  | String | Status about device detaching fromo place |

## subscribeForDeviceMessages - Subscribe for device messages
#### IN: parameters :
| Property | Type    | Description                                | Optional? |
| -------- | ------- | ------------------------------------------ | --------- |
| nodeid   | String  | Node ID                                    | YES       |
| deviceid | Integer | Device ID                                  | YES       |
| disable  | Boolean | Disable subscription for specified devices | YES       |
#### OUT: payload:
| Property | Type   | Description                              |
| -------- | ------ | ---------------------------------------- |
| message  | String | Status about device detaching from place |


## listSubscribedDevices - List subscribed devices
#### IN: parameters[] :
None
#### OUT: payload[] :
| Property | Sub-propery | Type    | Description |
| -------- | ----------- | ------- | ----------- |
| nodeid   |             | String  | Node ID     |
| deviceid |             | Integer | Device ID   |

## getNodeUpdateVersion - Get node newest available firmware version
#### IN: parameters :
| Property | Type   | Description | Optional? |
| -------- | ------ | ----------- | --------- |
| nodeid   | String | Node ID     | YES       |
#### OUT: payload[] :
| Property | Sub-propery | Type   | Description                                               |
| -------- | ----------- | ------ | --------------------------------------------------------- |
| version  |             | String | Version available for update ("0" if no update available) |

## nodeUpdate - Update node with newest available firmware version
#### IN: parameters :
| Property | Type   | Description | Optional? |
| -------- | ------ | ----------- | --------- |
| nodeid   | String | Node ID     | YES       |
#### OUT: payload[] :
| Property | Sub-propery | Type   | Description                       |
| -------- | ----------- | ------ | --------------------------------- |
| message  |             | String | Information about firmware update |

## getUpdateInfo - Get update information
#### IN: parameters[] :
None
#### OUT: payload[] :
| Property | Sub-propery | Type    | Description                        |
| -------- | ----------- | ------- | ---------------------------------- |
| gw       |             | Boolean | Does GW has an update              |
| opennode |             | Array   | List of OpenNodes having an update |
|          | name        | String  | OpenNode name                      |
|          | version     | String  | Version available for update       |
| log      |             | String  | Change log for update              |

## listDeviceTypes - list availale virtual devices by contact type
### IN:  parameters :
| Property    | Type     | Description                 | Optional? |
| ----------- | -------- | --------------------------- | --------- |
| contacttype | String[] | Array of list contact types | YES       |
### OUT: payload:
| Property    | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| name        | String   | Device name                      |
| contacttype | String[] | Array of contact types in device |
| id          | String   | Device type ID                   |


# NOT IMPLEMENTED

## removeDeviceType - Remove virtual device template
### IN:  parameters :
| Property | Type     | Description             | Optional? |
| -------- | -------- | ----------------------- | --------- |
| id       | String[] | Array of device type ID |

### OUT: payload :
| Property | Type   | Description |
| -------- | ------ | ----------- |
| message  | String | Message     |


## createDeviceType - create virtual device
### IN:  parameters :
| Property    | Type     | Description            | Optional? |
| ----------- | -------- | ---------------------- | --------- |
| name        | String   | Virtual device name    |
| contacttype | String[] | Array of contact types |

### OUT: payload :
| Property | Type   | Description    |
| -------- | ------ | -------------- |
| id       | String | Device type ID |
