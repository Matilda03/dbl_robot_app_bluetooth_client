import React, { Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PermissionsAndroid, SafeAreaView, TextInput, Button, StyleSheet, Text, View} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import base64 from 'react-native-base64';

const SERVICE_UUID = "00000000-0000-0000-0000-0000feedc0de";
const CHARACTERISTIC_UUID = "00000000-0000-0000-000f-00dc0de00001";

export async function requestPermissions () {
  try {
    const loc = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Location permission for bluetooth scanning.',
        message: 'This app requires location permission to start scanning for bluetooth devices.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    const con = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, 
    );
    const scan = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
    );
    const adv = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
    );
    if (loc === PermissionsAndroid.RESULTS.GRANTED && con === PermissionsAndroid.RESULTS.GRANTED && scan === PermissionsAndroid.RESULTS.GRANTED && adv === PermissionsAndroid.RESULTS.GRANTED) {
      console.log("[BleInfo: Permissions accepted]");
    } else {
      console.error("[BleError: Permissions denied]");
      return false;
    }
  } catch (err) {
    console.warn(err);
    return false;
  }
 return true;
};

var hasPermissions = false;
var isConnected = false;
var connectedDevice;
var number = "";
var object;
var errors;

export default class App extends Component  {

  constructor() {
    super();
    this.manager = new BleManager();
  }

  componentDidMount() {
    console.log("[BleInfo: Bluetooth mounted]")
    const subscription = this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
            hasPermissions = requestPermissions();
            subscription.remove();
        }
    }, true);
  }

  scanAndConnect() {
    if (hasPermissions)
    {
      console.log("[BleInfo: Scanning...]");
      this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
            // Handle error (scanning will be stopped automatically)
            console.error(error);
            return;
      }

        // Check if it is a device you are looking for based on advertisement data
        // or other criteria.
        if (device.name === 'Rosti') {
            console.log("[BleInfo: Found the robot!]");
            // Stop scanning as it's not necessary if you are scanning for one device.
            this.manager.stopDeviceScan();

            device.connect()
          .then((device) => {
            console.log("[BleInfo: Discovering services and characteristics]");
            console.log("[BleInfo: Connected]");
            connectedDevice = device;
            isConnected = true;
            this.setState({connectedDevice: connectedDevice});
            return device.discoverAllServicesAndCharacteristics()
          })
          .catch((error) => {
            console.error(error.message);
          })
          };
        })
    }
    else
    {
      hasPermission = requestPermissions();
    }
  }

  sendNumber()
  {
    try{
    connectedDevice.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64.encode(number));
    connectedDevice.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, (error, characteristic) => {
      if (error) {
          console.log(error);
      } else {
        try{
          object = JSON.parse(base64.decode(characteristic.value));
          errors = [];
          for(var error in object.robot.errors)
          {
            switch (error) {
              case "0":
                errors.push("Belt light sensor timeout.\n")
                break;
              
              case "1":
              errors.push("Base light sensor timeout.\n")
              break;
            
              default:
                errors.push("Unknown error!\n")
                break;
            }
          }
          this.setState({object : object, errors: errors});
        }
        catch(e)
        {
          console.log(e);
        }
          //console.log("Received: " + base64.decode(characteristic.value));
      }
    });
    }
    catch(e)
    {
      console.log(e);
    }
  }

  disconnect ()
  {
    connectedDevice.cancelConnection();
    connectedDevice = null;
    object = null;
    errors = null;
    isConnected = false;
    this.setState({isConnected: isConnected, object: object, errors: null});
  }

  onChangeNumber(text)
  {
    number = text;
    this.setState({number: number});
  }

  render() {
    return (
    <View style={styles.container}>
      <Text>Rosti app!</Text>
      <Button title="Connect to Rosti" disabled={isConnected} onPress={() => this.scanAndConnect()}/>
      <TextInput
        style={styles.input}
        onChangeText={text => this.onChangeNumber(text)}
        value={number}
        placeholder="Enter the number"
        keyboardType="numeric"
      />
      <Button title="Start" disabled={!isConnected} onPress={() => this.sendNumber()}/>
      <Button title="Disconnect" disabled={!isConnected} onPress={() => this.disconnect()}/>
      <Text>{object ? "Name: " + object.robot.name : "Name: Not connected!"}</Text>
      <Text>{object ? "Number: " + object.robot.number : "Number: Not connected!"}</Text>
      <Text>{object ? "Base: " + object.robot.base : "Base: Not connected!"}</Text>
      <Text>{object ? "Color: " + object.robot.sensors.color : "Color: Not connected!"}</Text>
      {errors ? errors.length > 0 ? <Text style={{ color: "red" }}> {"Errors " + "(" + errors.length +"):\n" + errors} </Text> : <Text style={{ color: "lime" }}> {"Errors: None ✅"} </Text> : <Text>{"Errors: Not connected!"}</Text>}
      <StatusBar style="auto" />
    </View>
  );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 0.3,
    padding: 10,
  },
});