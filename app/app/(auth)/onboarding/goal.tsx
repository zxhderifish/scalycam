import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSettingsStore } from "@/lib/store/settings";

const GOALS: {
  id: "lose" | "maintain" | "gain";
  emoji: string;
  title: string;
  sub: string;
  tint: string;
  accent: string;
  default?: boolean;
}[] = [
  { id: "lose",     emoji: "↓", title: "Lose fat",    sub: "Slight calorie deficit",    tint: "#FBEAE3", accent: "#E1654A" },
  { id: "maintain", emoji: "=", title: "Maintain",    sub: "Hold your current weight",  tint: "#FBF2DC", accent: "#E8B339", default: true },
  { id: "gain",     emoji: "↑", title: "Gain muscle", sub: "Surplus + high protein",    tint: "#DFEDEB", accent: "#4F8F8A" },
];

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

export default function GoalScreen() {
  const router = useRouter();
  const { update } = useSettingsStore();
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("maintain");

  async function next() {
    await update({ goal });
    router.push("/(auth)/onboarding/activity" as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F1EEE6" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 70, paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ProgressDots step={2} total={4} />

        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            color: "#15140F",
            marginTop: 20,
            letterSpacing: -0.5,
          }}
        >
          What's your goal?
        </Text>
        <Text style={{ fontSize: 15, color: "#B6B1A5", marginTop: 6 }}>
          You can change this anytime.
        </Text>

        <View style={{ marginTop: 28, gap: 12 }}>
          {GOALS.map(({ id, emoji, title, sub, tint, accent }) => {
            const selected = goal === id;
            return (
              <Pressable
                key={id}
                onPress={() => setGoal(id)}
                style={({ pressed }) => ({
                  borderRadius: 22,
                  padding: 20,
                  backgroundColor: selected ? "#19260A" : "#FFFFFF",
                  shadowColor: "#15140F",
                  shadowOpacity: selected ? 0.18 : 0.05,
                  shadowRadius: selected ? 24 : 16,
                  shadowOffset: { width: 0, height: selected ? 6 : 2 },
                  elevation: selected ? 6 : 2,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  {/* Icon circle */}
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: selected ? "#C8F23D" : tint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 26,
                        fontWeight: "700",
                        color: selected ? "#19260A" : accent,
                      }}
                    >
                      {emoji}
                    </Text>
                  </View>

                  {/* Text block */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: selected ? "#FFFFFF" : "#15140F",
                      }}
                    >
                      {title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: selected ? "rgba(255,255,255,0.75)" : "#B6B1A5",
                        marginTop: 2,
                      }}
                    >
                      {sub}
                    </Text>
                  </View>

                  {/* Checkmark */}
                  {selected && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: "#C8F23D",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#19260A", fontWeight: "700" }}>✓</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
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
          onPress={next}
          style={({ pressed }) => ({
            backgroundColor: "#19260A",
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
