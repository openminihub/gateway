### OpenMiniHub Gateway API
List of API commands
- [createPlace](#createplace)
- [listPlaces](#listplaces)
- [removePlace](#removeplace)
- [renamePlace](#renameplace)
- [listDevices](#listdevices)
- [renameDevice](#renamedevice)
- [listDeviceTypes](#listdevicetypes)
- [listMessageTypes](#listmessagetypes)
- [listNodes](#listnodes)
- [renameNode](#renamenode)
- [getDeviceValues](#getdevicevalues)
- [attachDeviceToPlace](#attachdevicetoplace)
- [detachDeviceFromPlace](#detachdevicefromplace)
- [updateGateway](#updategateway)
- [controlGateway](#controlgateway)

### To call API commands you must provide:
| Property   | Type    | Description                             |
|------------|---------|-----------------------------------------|
| ID         | Integer | Command ID                              |
| CMD        | String  | Command name                            |
| PARAMETERS | Array   | List of parameters required for command |

### Command _OUTPUT_ will return:
| Property | Type    | Description                     |
|----------|---------|---------------------------------|
| ID       | Integer | Command ID                      |
| RESULT   | Integer | Command result [0-false,1-true] |
| PAYLOAD  | Array   | List of payload                 |

## createPlace
**Description: Create the new Place**
**IN:  parameters :**
| Property  | Type   | Description     | Optional? |
|-----------|--------|-----------------|-----------|
| name      | String | Place name      |           |
| parent_id | String | Parent place ID | YES       |
**OUT: payload :**
| Property  | Type    | Description     |
|-----------|---------|-----------------|
| id        | Integer | Place ID        |
| name      | String  | Place name      |
| parent_id | String  | Parent place ID |

## listPlaces
**Description: List the Places**
**IN:  parameters :**
| Property  | Type    | Description     | Optional? |
|-----------|---------|-----------------|-----------|
| parent_id | Integer | Parent place ID | YES       |
**OUT: payload[] :**
| Property  | Type    | Description     |
|-----------|---------|-----------------|
| id        | Integer | Place ID        |
| name      | String  | Place name      |
| parent_id | String  | Parent place ID |

## removePlace
**Description:  Remove the Place**
**IN:  parameters :**
| Property | Type      | Description                 | Optional? |
|----------|-----------|-----------------------------|-----------|
| id       | Integer[] | Array of place ID to remove |           |
**OUT: payload :**
| Property      | Type  | Description    |
|---------------|-------|----------------|
| placesRemoved | Array | Removed places |

## renamePlace
**Description: Rename the Place**
**IN:  parameters :**
| Property | Type   | Description        | Optional? |
|----------|--------|--------------------|-----------|
| id       | String | Place ID to rename |           |
| name     | String | Place name to set  |           |
**OUT: payload :**
| Property     | Type  | Description   |
|--------------|-------|---------------|
| placeRenamed | Array | Renamed place |

## listDevices
**Description: List devices**
**IN: parameters :**
| Property      | Type      | Description           | Optional? |
|---------------|-----------|-----------------------|-----------|
| node_id       | String[]  | Array of node ID      | YES       |
| devicetype_id | Integer[] | Array of device types | YES       |
| place_id      | Integer[] | Array of place ID     | YES       |
**OUT: payload[] :**
| Property      | Sub-property | Type    | Description                       | Optional? |
|---------------|--------------|---------|-----------------------------------|-----------|
| node_id       |              | String  | Node ID                           |           |
| id            |              | String  | Device ID in node                 |           |
| devicetype_id |              | Integer | Device type ID                    |           |
| name          |              | String  | Device name                       |           |
| place_id      |              | Integer | Place ID where device is assigned | YES       |

## renameDevice
**Description: Rename the Device**
**IN:  parameters :**
| Property | Type   | Description         | Optional? |
|----------|--------|---------------------|-----------|
| node_id  | String | Node ID to rename   |           |
| id       | String | Device ID to rename |           |
| name     | String | Device name to set  |           |
**OUT: payload :**
| Property      | Type  | Description    |
|---------------|-------|----------------|
| deviceRenamed | Array | Renamed device |

## listDeviceTypes
**Description: List defined device types**
**IN: parameters :**
| Property | Type      | Description              | Optional? |
|----------|-----------|--------------------------|-----------|
| id       | Integer[] | Array of device type IDs | YES       |
| type     | Integer[] | Array of device types    | YES       |
**OUT: payload[] :**
| Property | Type     | Description                            |
|----------|----------|----------------------------------------|
| id       | Integer  | Device type ID                         |
| type     | Integer  | Device type                            |
| name     | String   | Device type description/name           |
| messages | String[] | Array of available messages for device |

## listMessageTypes
**Description: List device message types**
**IN: parameters :**
| Property | Type      | Description                   | Optional? |
|----------|-----------|-------------------------------|-----------|
| id       | Integer[] | Array of device message IDs   | YES       |
| type     | String[]  | Array of device message types | YES       |
**OUT: payload[] :**
| Property | Type    | Description                |
|----------|---------|----------------------------|
| id       | Integer | Device message ID          |
| type     | String  | Device message type        |
| name     | String  | Device message description |
| ro       | Boolean | Is message READ ONLY?      |

## listNodes
**Description: Get list of nodes**
**IN:  none**
**OUT: payload[] :**
| Property | Type   | Description                | Optional? |
|----------|--------|----------------------------|-----------|
| type     | String | Node type (OpenNode / ESP) |           |
| name     | String | Node name                  |           |
| board    | String | Node firmware name         |           |
| version  | String | Node firmware version      |           |
| ip       | String | Node IP adress             | YES       |
| id       | String | node ID                    |           |

## renameNode
**Description: Rename the Node**
**IN:  parameters :**
| Property | Type   | Description       |
|----------|--------|-------------------|
| id       | String | Node ID to rename |
| name     | String | Node name to set  |
**OUT: payload :**
| Property    | Type  | Description  |
|-------------|-------|--------------|
| nodeRenamed | Array | Renamed node |

## getDeviceValues
**Description: Get requested device latest values**
**IN: parameters[] :**
| Property  | Type   | Description | Optional? |
|-----------|--------|-------------|-----------|
| node_id   | String | Node ID     | YES       |
| device_id | String | Device ID   | YES       |
**OUT: payload[] :**
| Property      | Sub-propery    | Type    | Description             |
|---------------|----------------|---------|-------------------------|
| node_id       |                | String  | Node ID                 |
| device_id     |                | String  | Device id               |
| devicetype_id |                | Integer | Device type ID          |
| name          |                | String  | Device name             |
| place_id      |                | Integer | Place ID                |
| messages      |                | Array[] | List of device messages |
|               | messagetype_id | Integer | Message type            |
|               | value          | Float   | Message value           |
|               | rssi           | Integer | Signal strnegth         |
|               | updatedAt      | Date    | Last update timestamp   |

## attachDeviceToPlace
**Description: Attach the device to the Place**
**IN: parameters :**
| Property  | Type    | Description |
|-----------|---------|-------------|
| node_id   | String  | Node ID     |
| device_id | String  | Device ID   |
| place_id  | Integer | Place ID    |
**OUT: payload:**
| Property       | Type  | Description     |
|----------------|-------|-----------------|
| deviceAttached | Array | Attached device |

## detachDeviceFromPlace
**Description: Detach the device from the Place**
**IN: parameters :**
| Property  | Type   | Description |
|-----------|--------|-------------|
| node_id   | String | Node ID     |
| device_id | String | Device ID   |
**OUT: payload:**
| Property       | Type  | Description     |
|----------------|-------|-----------------|
| deviceDetached | Array | Detached device |

## updateGateway
**Description: Update Gateway software from git repo**
**IN: none**
**OUT: payload:**
| Property | Type   | Description                    |
|----------|--------|--------------------------------|
| message  | String | Status about GW update process |

## controlGateway
**Description: Execute command on gateway**
**IN: parameters[] :**
| Property | Type    | Description        |
|----------|---------|--------------------|
| sudo     | Boolean | Use 'sudo'         |
| cmd      | String  | Command to execute |
**OUT: payload:**
| Property | Type   | Description                   |
|----------|--------|-------------------------------|
| message  | String | Status about executed command |
