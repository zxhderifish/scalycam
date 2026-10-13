import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Rect, Ellipse, Circle, Text as SvgText, G } from "react-native-svg";
import { Device } from "react-native-ble-plx";
import { scanForScalyCam, connectAndBond } from "@/lib/ble/manager";
import { decodeDeviceInfo, CHAR_DEVICE_INFO, SCALY_SERVICE_UUID } from "@/lib/ble/protocol";
import { api } from "@/lib/api";
import { useDeviceStore } from "@/lib/store/device";

export default function PairingScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setBondedDevice } = useDeviceStore();

  function startScan() {
    setDevices([]);
    setError(null);
    setScanning(true);
    const stop = scanForScalyCam(
      (device) => setDevices((prev) => prev.find((d) => d.id === device.id) ? prev : [...prev, device]),
      (err) => { console.error(err); setScanning(false); setError("Bluetooth scan failed. Check permissions."); }
    );
    setTimeout(() => { stop(); setScanning(false); }, 30_000);
  }

  async function pair(device: Device) {
    setConnecting(device.id);
    setError(null);
    try {
      const connected = await connectAndBond(device);
      const infoChar = await connected.readCharacteristicForService(SCALY_SERVICE_UUID, CHAR_DEVICE_INFO);
      if (!infoChar.value) throw new Error("No device info");
      const bytes = Uint8Array.from(atob(infoChar.value), c => c.charCodeAt(0));
      const { chip_id, firmware_version } = decodeDeviceInfo(bytes);
      const result = await api.pairDevice(chip_id, device.id, firmware_version) as { id: string };
      setBondedDevice({ deviceId: result.id, chipId: chip_id, bleAddress: device.id, firmwareVersion: firmware_version });
      router.back();
    } catch (err) {
      console.error("Pairing failed", err);
      setError('Pairing failed. Make sure the scale shows "Pair me".');
    } finally {
      setConnecting(null);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      {/* Top bar */}
      <View className="flex-row items-center px-4 pt-14 pb-3.5 bg-bg" style={{ gap: 8 }}>
        <TouchableOpacity
          className="w-[38px] h-[38px] rounded-full bg-surface items-center justify-center"
          style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
          onPress={() => router.back()}
        >
          <Text className="text-ink text-lg">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-semibold text-ink text-center" style={{ letterSpacing: -0.3 }}>
          Pair your scale
        </Text>
        <View className="w-[38px]" />
      </View>

      <View className="flex-1 px-6 pt-4">
        {/* Hero illustration card */}
        <View
          className="bg-olive rounded-3xl p-6 mb-6 items-center"
          style={{ shadowColor: "#19260A", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Svg width={200} height={150} viewBox="0 0 240 180" style={{ overflow: "visible" } as any}>
              {/* signal waves */}
              <Circle cx={120} cy={105} r={40} fill="none" stroke="#C8F23D" strokeWidth={1.5} opacity={0.4} />
              <Circle cx={120} cy={105} r={55} fill="none" stroke="#C8F23D" strokeWidth={1} opacity={0.25} />
              <Circle cx={120} cy={105} r={70} fill="none" stroke="#C8F23D" strokeWidth={0.8} opacity={0.15} />
              {/* base shadow */}
              <Ellipse cx={120} cy={155} rx={78} ry={14} fill="rgba(200,242,61,0.18)" />
              {/* scale body */}
              <Rect x={56} y={120} width={128} height={32} rx={9} fill="#0d1605" stroke="#C8F23D" strokeWidth={1.5} />
              <Rect x={60} y={115} width={120} height={10} rx={5} fill="#0a1303" stroke="#C8F23D" strokeWidth={1.2} />
              {/* display */}
              <Rect x={86} y={130} width={68} height={14} rx={2} fill="#0a1303" />
              <SvgText x={120} y={141} textAnchor="middle" fill="#C8F23D" fontSize={9} fontWeight="600">PAIR ME</SvgText>
              {/* side button */}
              <Rect x={50} y={128} width={6} height={14} rx={2} fill="#C8F23D" />
              {/* camera arm */}
              <Rect x={172} y={40} width={10} height={84} rx={4} fill="#0d1605" stroke="#C8F23D" strokeWidth={1.2} />
              <Rect x={118} y={36} width={68} height={12} rx={5} fill="#0d1605" stroke="#C8F23D" strokeWidth={1.2} />
              {/* camera */}
              <Rect x={92} y={20} width={48} height={36} rx={10} fill="#0a1303" stroke="#C8F23D" strokeWidth={1.8} />
              <Circle cx={116} cy={38} r={12} fill="#000" stroke="#C8F23D" strokeWidth={1.4} />
              <Circle cx={116} cy={38} r={6} fill="#C8F23D" />
              <Circle cx={114} cy={36} r={1.8} fill="#fff" />
            </Svg>
          </View>
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
              <Text className="text-lime text-xs font-bold uppercase tracking-widest">Searching…</Text>
            </View>
          )}
        </View>

        {/* Scan button */}
        <TouchableOpacity
          className="bg-lime rounded-full py-3.5 items-center mb-5"
          onPress={startScan}
          disabled={scanning}
          activeOpacity={0.85}
        >
          {scanning
            ? <ActivityIndicator color="#19260A" />
            : <Text className="text-olive font-bold text-base">Scan for scale</Text>
          }
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View className="bg-warn-tint rounded-2xl px-4 py-3 mb-4">
            <Text className="text-warn text-sm font-medium">{error}</Text>
          </View>
        )}

        {/* Found devices */}
        {devices.length > 0 && (
          <>
            <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-2 pl-1">
              Found {devices.length} device{devices.length !== 1 ? "s" : ""}
            </Text>
            <View
              className="bg-surface rounded-2xl overflow-hidden mb-4"
              style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            >
              {devices.map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center px-4 py-3.5 ${index < devices.length - 1 ? "border-b" : ""}`}
                  style={index < devices.length - 1 ? { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 } : undefined}
                >
                  <View className="w-11 h-11 rounded-xl bg-olive items-center justify-center mr-3">
                    <Text className="text-lime text-xl">⚖</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-ink">{item.name ?? "ScalyCam"}</Text>
                    <Text className="text-xs text-ink-mute mt-0.5">Strong signal · nearby</Text>
                  </View>
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
              ))}
            </View>
          </>
        )}

        {/* Troubleshooting hint */}
        <View
          className="rounded-2xl p-3.5 flex-row items-center gap-3"
          style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.14)", borderStyle: "dashed" } as any}
        >
          <View className="w-6 h-6 rounded-full bg-surface items-center justify-center">
            <Text className="text-ink-2 text-xs font-bold">?</Text>
          </View>
          <Text className="flex-1 text-sm text-ink-2 font-medium">Don't see your device?</Text>
          <Text className="text-ink-faint text-base">›</Text>
        </View>
      </View>
    </View>
  );
}
