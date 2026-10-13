import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Device } from "react-native-ble-plx";
import { scanForScalyCam, connectAndBond } from "@/lib/ble/manager";
import { decodeDeviceInfo } from "@/lib/ble/protocol";
import { CHAR_DEVICE_INFO, SCALY_SERVICE_UUID } from "@/lib/ble/protocol";
import { api } from "@/lib/api";
import { useDeviceStore } from "@/lib/store/device";

export default function PairScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { setBondedDevice } = useDeviceStore();

  function startScan() {
    setDevices([]);
    setScanning(true);
    const stop = scanForScalyCam(
      (device) => setDevices((prev) => prev.find((d) => d.id === device.id) ? prev : [...prev, device]),
      (err) => { console.error(err); setScanning(false); }
    );
    setTimeout(() => { stop(); setScanning(false); }, 30_000);
  }

  async function pair(device: Device) {
    setConnecting(device.id);
    try {
      const connected = await connectAndBond(device);
      const infoChar = await connected.readCharacteristicForService(SCALY_SERVICE_UUID, CHAR_DEVICE_INFO);
      if (!infoChar.value) throw new Error("No device info");
      const bytes = Uint8Array.from(atob(infoChar.value), c => c.charCodeAt(0));
      const { chip_id, firmware_version } = decodeDeviceInfo(bytes);

      const result = await api.pairDevice(chip_id, device.id, firmware_version) as { id: string };
      setBondedDevice({ deviceId: result.id, chipId: chip_id, bleAddress: device.id, firmwareVersion: firmware_version });
      router.replace("/(tabs)" as any);
    } catch (err) {
      console.error("Pairing failed", err);
    } finally {
      setConnecting(null);
    }
  }

  return (
    <View className="flex-1 bg-bg px-6 pt-16">
      {/* Hero */}
      <View className="bg-olive rounded-3xl p-6 mb-6 items-center"
        style={{ shadowColor: "#19260A", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
        <Text className="text-lime text-6xl mb-4">⚖</Text>
        <Text className="text-white text-[22px] font-semibold text-center mb-2" style={{ letterSpacing: -0.5 }}>
          Long-press the side button
        </Text>
        <Text className="text-white/60 text-sm text-center leading-relaxed">
          Hold for 3 seconds until the scale's screen shows{" "}
          <Text className="text-lime font-semibold">"Pair me"</Text>
        </Text>
        {scanning && (
          <View className="flex-row items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-lime/20">
            <View className="w-1.5 h-1.5 rounded-full bg-lime" />
            <Text className="text-lime text-xs font-bold uppercase tracking-widest">Searching</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        className="bg-lime rounded-full py-3.5 items-center mb-6"
        onPress={startScan}
        disabled={scanning}
        activeOpacity={0.85}
      >
        {scanning
          ? <ActivityIndicator color="#19260A" />
          : <Text className="text-olive font-bold text-base">Scan for scale</Text>
        }
      </TouchableOpacity>

      {devices.length > 0 && (
        <>
          <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-2 pl-1">
            Found {devices.length} device{devices.length !== 1 ? "s" : ""}
          </Text>
          <View
            className="bg-surface rounded-2xl overflow-hidden mb-4"
            style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <FlatList
              data={devices}
              keyExtractor={(d) => d.id}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View
                  className={`flex-row items-center px-4 py-3.5 ${index < devices.length - 1 ? "border-b" : ""}`}
                  style={index < devices.length - 1 ? { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 } : undefined}
                >
                  <View className="w-11 h-11 rounded-xl bg-olive items-center justify-center mr-3">
                    <Text className="text-lime text-xl">⚖</Text>
                  </View>
                  <Text className="flex-1 font-semibold text-ink text-[15px]">{item.name ?? "ScalyCam"}</Text>
                  <TouchableOpacity
                    className="px-4 py-2 rounded-full bg-lime"
                    onPress={() => pair(item)}
                    disabled={connecting === item.id}
                    activeOpacity={0.8}
                  >
                    {connecting === item.id
                      ? <ActivityIndicator size="small" color="#19260A" />
                      : <Text className="text-olive font-bold text-sm">Pair</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </>
      )}

      {!scanning && devices.length === 0 && (
        <View
          className="border rounded-2xl p-4 flex-row items-center gap-3 mb-4"
          style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.14)", borderStyle: "dashed" } as any}
        >
          <View className="w-6 h-6 rounded-full bg-surface items-center justify-center">
            <Text className="text-ink-2 text-xs font-bold">?</Text>
          </View>
          <Text className="flex-1 text-sm text-ink-2 font-medium">Don't see your device?</Text>
          <Text className="text-ink-faint text-base">›</Text>
        </View>
      )}

      <TouchableOpacity onPress={() => router.replace("/(tabs)" as any)} className="mt-2">
        <Text className="text-center text-ink-mute text-sm">Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}
