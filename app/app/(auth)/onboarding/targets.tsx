import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSettingsStore } from "@/lib/store/settings";
import { calculateTargets } from "@/lib/nutrition";

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            borderRadius: 999,
            width: i + 1 === step ? 24 : 6,
            backgroundColor: i + 1 === step ? "#19260A" : "#B6B1A5",
          }}
        />
      ))}
    </View>
  );
}

const GOAL_LABEL: Record<string, string> = {
  lose: "lose fat",
  maintain: "maintain weight",
  gain: "gain muscle",
};

const ACTIVITY_LABEL: Record<number, string> = {
  1.2: "sedentary",
  1.4: "light",
  1.6: "moderate",
  1.8: "very active",
};

export default function TargetsScreen() {
  const router = useRouter();
  const { settings, update } = useSettingsStore();
  const [targets, setTargets] = useState<ReturnType<typeof calculateTargets> | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (
      !settings?.weight_kg ||
      !settings.height_cm ||
      !settings.age ||
      !settings.sex ||
      !settings.activity_level ||
      !settings.goal
    )
      return;
    const t = calculateTargets({
      weight_kg: settings.weight_kg,
      height_cm: settings.height_cm,
      age: settings.age,
      sex: settings.sex as "male" | "female" | "other",
      activity_level: settings.activity_level as 1.2 | 1.4 | 1.6 | 1.8,
      goal: settings.goal as "lose" | "maintain" | "gain",
    });
    setTargets(t);
  }, [settings]);

  async function saveAndContinue() {
    if (!targets) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await update({
      daily_calorie_target: targets.calorieTarget,
      daily_protein_g: targets.proteinG,
      daily_carbs_g: targets.carbsG,
      daily_fat_g: targets.fatG,
      timezone,
    });
    router.push("/(auth)/onboarding/pair" as any);
  }

  if (!targets) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F1EEE6", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#19260A" />
      </View>
    );
  }

  const goalLabel = GOAL_LABEL[settings?.goal ?? ""] ?? settings?.goal ?? "your goal";
  const activityLabel = ACTIVITY_LABEL[settings?.activity_level ?? 0] ?? "moderate";

  const macroTiles = [
    { label: "Protein", value: targets.proteinG, bg: "#FBEAE3", color: "#E1654A" },
    { label: "Carbs",   value: targets.carbsG,   bg: "#FBF2DC", color: "#E8B339" },
    { label: "Fat",     value: targets.fatG,      bg: "#DFEDEB", color: "#4F8F8A" },
  ];

  const canContinue = !targets.warning || confirmed;

  return (
    <View style={{ flex: 1, backgroundColor: "#F1EEE6" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 70,
          paddingHorizontal: 24,
          paddingBottom: 120,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots — left aligned */}
        <View style={{ width: "100%", alignItems: "flex-start" }}>
          <ProgressDots step={4} total={4} />
        </View>

        {/* Top chip */}
        <View
          style={{
            marginTop: 32,
            backgroundColor: "#C8F23D",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#19260A",
              textTransform: "uppercase",
              letterSpacing: 0.72,
            }}
          >
            ✦ Your daily target
          </Text>
        </View>

        {/* Big calorie number */}
        <Text
          style={{
            fontSize: 84,
            fontWeight: "500",
            color: "#15140F",
            letterSpacing: -4,
            lineHeight: 80,
            marginTop: 28,
            textAlign: "center",
          }}
        >
          {targets.calorieTarget}
        </Text>
        <Text style={{ fontSize: 14, color: "#B6B1A5", marginTop: 8, textAlign: "center" }}>
          kcal per day
        </Text>

        {/* Macro tiles */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 36, width: "100%" }}>
          {macroTiles.map(({ label, value, bg, color }) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: bg,
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color,
                  textTransform: "uppercase",
                  letterSpacing: 0.66,
                  marginBottom: 4,
                }}
              >
                {label}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                <Text style={{ fontSize: 28, fontWeight: "600", color: "#15140F" }}>{value}</Text>
                <Text style={{ fontSize: 13, color: "#B6B1A5" }}>g</Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI note card */}
        <View
          style={{
            marginTop: 28,
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Text style={{ color: "#19260A", flexShrink: 0, marginTop: 1 }}>✦</Text>
          <Text
            style={{
              fontSize: 13,
              color: "#B6B1A5",
              lineHeight: 13 * 1.45,
              flex: 1,
            }}
          >
            Based on your goal to{" "}
            <Text style={{ color: "#15140F" }}>{goalLabel}</Text>, with{" "}
            <Text style={{ color: "#15140F" }}>{activityLabel}</Text> activity. You can tweak these
            later in Settings.
          </Text>
        </View>

        {/* Warning card */}
        {targets.warning && (
          <View
            style={{
              marginTop: 16,
              width: "100%",
              backgroundColor: "#FBF2DC",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 13, color: "#15140F", lineHeight: 13 * 1.5 }}>
              {targets.warning}
            </Text>
            <Pressable onPress={() => setConfirmed(true)} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#19260A" }}>
                I understand →
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 16,
          backgroundColor: "#F1EEE6",
        }}
      >
        <Pressable
          onPress={saveAndContinue}
          disabled={!canContinue}
          style={({ pressed }) => ({
            backgroundColor: canContinue ? "#19260A" : "#E8E5DD",
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontWeight: "600",
              fontSize: 16,
              color: canContinue ? "#FFFFFF" : "#B6B1A5",
            }}
          >
            I understand · continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
