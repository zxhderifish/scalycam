import { BleManager as RNBleManager, Device, State } from "react-native-ble-plx";
import { Platform } from "react-native";
import { SCALY_SERVICE_UUID } from "./protocol";

// Singleton BLE manager — only available on native (iOS/Android)
// On web, BLE is not supported; all BLE functions are no-ops.
export const bleManager: RNBleManager = Platform.OS !== "web"
  ? new RNBleManager({
      restoreStateIdentifier: "scalycam-restore-1",
      restoreStateFunction: (restoredState) => {
        if (restoredState?.connectedPeripherals?.length) {
          console.log("[BLE] State restored with", restoredState?.connectedPeripherals?.length ?? 0, "peripherals");
        }
      },
    })
  : (null as unknown as RNBleManager);

export function scanForScalyCam(
  onFound: (device: Device) => void,
  onError: (error: Error) => void
): () => void {
  if (!bleManager) return () => {};
  bleManager.startDeviceScan([SCALY_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
    if (error) { onError(error); return; }
    if (device) onFound(device);
  });
  return () => bleManager.stopDeviceScan();
}

export async function connectAndBond(device: Device): Promise<Device> {
  const connected = await device.connect({ requestMTU: Platform.OS === "android" ? 517 : undefined });
  await connected.discoverAllServicesAndCharacteristics();
  return connected;
}
