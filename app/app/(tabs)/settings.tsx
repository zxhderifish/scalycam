import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { useSettingsStore } from "@/lib/store/settings";
import { useDeviceStore } from "@/lib/store/device";
import { api } from "@/lib/api";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest px-6 pt-6 pb-1.5">
      {title}
    </Text>
  );
}

function CardRow({
  label, value, accent, warn, last, chevron = true, onPress,
}: {
  label: string; value?: string; accent?: string; warn?: boolean;
  last?: boolean; chevron?: boolean; onPress?: () => void;
}) {
  const inner = (
    <View
      className={`flex-row items-center px-4 py-3.5 gap-2 ${last ? "" : "border-b"}`}
      style={last ? undefined : { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 }}
    >
      {accent && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />}
      <Text className={`flex-1 text-[15px] font-medium ${warn ? "text-warn" : "text-ink"}`}>{label}</Text>
      {value && <Text className="text-sm font-medium text-ink-2">{value}</Text>}
      {chevron && !warn && <Text className="text-ink-faint text-base ml-1">›</Text>}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity activeOpacity={0.6} onPress={onPress}>{inner}</TouchableOpacity>;
  }
  return inner;
}

function ToggleRow({ label, value, onChange, last }: { label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${last ? "" : "border-b"}`}
      style={last ? undefined : { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 }}
    >
      <Text className="flex-1 text-[15px] font-medium text-ink">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#B6B1A5", true: "#19260A" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#B6B1A5"
      />
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="mx-4 bg-surface rounded-2xl overflow-hidden"
      style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { settings, fetch, update } = useSettingsStore();
  const { deviceId, chipId, firmwareVersion, clearBondedDevice } = useDeviceStore();
  const router = useRouter();
  const [eveningRecap, setEveningRecap] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [weightNudge, setWeightNudge] = useState(false);

  useEffect(() => { fetch(); }, []);
  useEffect(() => {
    setEveningRecap(settings?.notification_prefs?.evening_recap ?? true);
  }, [settings]);

  async function toggleEveningRecap(val: boolean) {
    setEveningRecap(val);
    await update({ notification_prefs: { ...(settings?.notification_prefs ?? {}), evening_recap: val, per_meal: false, errors_only: false } });
  }

  async function handleUnpair() {
    if (!deviceId) return;
    await api.unpairDevice(deviceId);
    clearBondedDevice();
  }

  // Avatar initials from email
  const initials = (user?.email ?? "?").substring(0, 2).toUpperCase();

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Title */}
      <View className="px-5 pt-16 pb-1">
        <Text className="text-[30px] font-bold text-ink" style={{ letterSpacing: -0.6 }}>Settings</Text>
      </View>

      {/* Profile header card */}
      <View className="px-4 pt-5">
        <View
          className="bg-surface rounded-2xl p-4 flex-row items-center gap-3.5"
          style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        >
          <View className="w-[52px] h-[52px] rounded-full bg-olive items-center justify-center">
            <Text className="text-lime text-xl font-bold">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-semibold text-ink">ScalyCam User</Text>
            <Text className="text-[13px] text-ink-mute mt-0.5">{user?.email ?? "—"}</Text>
          </View>
          <Text className="text-ink-faint text-base">›</Text>
        </View>
      </View>

      {/* Profile section */}
      <SectionHeader title="Profile" />
      <Card>
        <CardRow label="Height" value={settings?.height_cm ? `${settings.height_cm} cm` : "—"} />
        <CardRow label="Weight" value={settings?.weight_kg ? `${settings.weight_kg} kg` : "—"} />
        <CardRow label="Age" value={settings?.age ? `${settings.age}` : "—"} />
        <CardRow label="Sex" value={settings?.sex ? settings.sex.charAt(0).toUpperCase() + settings.sex.slice(1) : "—"} last />
      </Card>

      {/* Daily targets */}
      <SectionHeader title="Daily targets" />
      <Card>
        <CardRow label="Calories" value={settings?.daily_calorie_target ? `${settings.daily_calorie_target} kcal` : "—"} accent="#19260A" />
        <CardRow label="Protein" value="— g" accent="#E1654A" />
        <CardRow label="Carbs" value="— g" accent="#E8B339" />
        <CardRow label="Fat" value="— g" accent="#4F8F8A" last />
      </Card>

      {/* Paired devices */}
      <SectionHeader title="Paired devices" />
      <Card>
        {chipId ? (
          <View
            className="px-4 py-3.5 border-b"
            style={{ borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 }}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-[38px] h-[38px] rounded-xl bg-olive items-center justify-center">
                <Text className="text-lime text-base">⚖</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">ScalyCam · Kitchen</Text>
                <Text className="text-[11px] text-ink-mute mt-0.5">
                  {chipId} · FW {firmwareVersion ?? "—"}
                </Text>
              </View>
              <TouchableOpacity
                className="px-3 py-1.5 rounded-full bg-warn-tint"
                onPress={handleUnpair}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-semibold text-warn">Unpair</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <TouchableOpacity
          className="flex-row items-center gap-2 px-4 py-3.5"
          activeOpacity={0.6}
          onPress={() => router.push("/pairing" as any)}
        >
          <Text className="text-olive text-xl font-light">+</Text>
          <Text className="text-[14px] font-semibold text-olive">
            {chipId ? "Pair another device" : "Pair your scale"}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <Card>
        <ToggleRow label="Evening missed-meal reminder" value={eveningRecap} onChange={toggleEveningRecap} />
        <ToggleRow label="Weekly summary" value={weeklySummary} onChange={setWeeklySummary} />
        <ToggleRow label="Weight log nudge" value={weightNudge} onChange={setWeightNudge} last />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: "rgba(21,20,15,0.07)" }}>
          <Text style={{ fontSize: 12, color: "#B6B1A5" }}>Notifications disabled? </Text>
          <Text style={{ fontSize: 12, color: "#19260A", fontWeight: "600" }}>Open Settings</Text>
        </View>
      </Card>

      {/* About / Sign out */}
      <View className="h-5" />
      <Card>
        <CardRow label="About" />
        <CardRow label="Privacy" />
        <CardRow label="Terms" />
        <CardRow label="Sign out" warn last chevron={false} onPress={signOut} />
      </Card>

      <Text className="text-center text-ink-mute text-[11px] mt-5">
        ScalyCam · v1.0.0
      </Text>
    </ScrollView>
  );
}
