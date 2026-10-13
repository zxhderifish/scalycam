import { create } from "zustand";
import { mmkvGet, mmkvSet, mmkvDelete } from "../persist/mmkv";

interface DeviceState {
  deviceId: string | null;          // Supabase devices.id
  chipId: string | null;
  bleAddress: string | null;
  firmwareVersion: string | null;
  setBondedDevice: (info: { deviceId: string; chipId: string; bleAddress: string; firmwareVersion: string }) => void;
  clearBondedDevice: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  deviceId: mmkvGet<string>("bonded_device_id"),
  chipId: mmkvGet<string>("bonded_chip_id"),
  bleAddress: mmkvGet<string>("bonded_ble_address"),
  firmwareVersion: mmkvGet<string>("bonded_fw"),
  setBondedDevice: (info) => {
    mmkvSet("bonded_device_id", info.deviceId);
    mmkvSet("bonded_chip_id", info.chipId);
    mmkvSet("bonded_ble_address", info.bleAddress);
    mmkvSet("bonded_fw", info.firmwareVersion);
    set(info);
  },
  clearBondedDevice: () => {
    mmkvDelete("bonded_device_id");
    mmkvDelete("bonded_chip_id");
    mmkvDelete("bonded_ble_address");
    mmkvDelete("bonded_fw");
    set({ deviceId: null, chipId: null, bleAddress: null, firmwareVersion: null });
  },
}));
