import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useSettingsStore } from "@/lib/store/settings";

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

function SedentaryIcon({ color }: { color: string }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="7" r="3" fill={color} />
      <Path d="M16 11v6l-4 5h-3M16 17h5l3 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9 28h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function WalkIcon({ color }: { color: string }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="17" cy="6" r="2.5" fill={color} />
      <Path
        d="M17 10l-3 6 3 4-2 7M17 16l4 3 2 5M14 14l-4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RunIcon({ color }: { color: string }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="20" cy="6" r="2.5" fill={color} />
      <Path
        d="M20 10l-5 4 3 5-4 6M18 19l4 2 3 6M15 14l-6 1M22 13l4 1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LiftIcon({ color }: { color: string }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="6" r="2.5" fill={color} />
      <Path
        d="M16 10v6M11 14h10M11 22v6M21 22v6M11 22h10"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Rect x={6} y={18} width={4} height={9} rx={1} fill={color} />
      <Rect x={22} y={18} width={4} height={9} rx={1} fill={color} />
    </Svg>
  );
}

type Glyph = "sit" | "walk" | "run" | "lift";

function ActivityIcon({ glyph, color }: { glyph: Glyph; color: string }) {
  if (glyph === "sit") return <SedentaryIcon color={color} />;
  if (glyph === "walk") return <WalkIcon color={color} />;
  if (glyph === "run") return <RunIcon color={color} />;
  return <LiftIcon color={color} />;
}

const LEVELS: {
  key: 1.2 | 1.4 | 1.6 | 1.8;
  title: string;
  sub: string;
  glyph: Glyph;
  default?: boolean;
}[] = [
  { key: 1.2, title: "Sedentary",   sub: "Mostly sitting",      glyph: "sit",  default: true },
  { key: 1.4, title: "Light",       sub: "1–3 workouts / week", glyph: "walk" },
  { key: 1.6, title: "Moderate",    sub: "4–5 workouts / week", glyph: "run" },
  { key: 1.8, title: "Very active", sub: "Daily training",      glyph: "lift" },
];

export default function ActivityScreen() {
  const router = useRouter();
  const { update } = useSettingsStore();
  const [level, setLevel] = useState<1.2 | 1.4 | 1.6 | 1.8>(1.2);

  async function next() {
    await update({ activity_level: level });
    router.push("/(auth)/onboarding/targets" as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F1EEE6" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 70, paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ProgressDots step={3} total={4} />

        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            color: "#15140F",
            marginTop: 20,
            letterSpacing: -0.5,
          }}
        >
          How active are you?
        </Text>
        <Text style={{ fontSize: 15, color: "#B6B1A5", marginTop: 6 }}>
          Outside of food, on a typical week.
        </Text>

        <View style={{ marginTop: 28 }}>
          {/* 2×2 grid */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Column 1 */}
            <View style={{ flex: 1, gap: 12 }}>
              {LEVELS.slice(0, 2).map(({ key, title, sub, glyph }) => {
                const selected = level === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setLevel(key)}
                    style={({ pressed }) => ({
                      borderRadius: 20,
                      padding: 18,
                      minHeight: 170,
                      flexDirection: "column",
                      justifyContent: "space-between",
                      backgroundColor: selected ? "#19260A" : "#FFFFFF",
                      shadowColor: "#15140F",
                      shadowOpacity: selected ? 0.18 : 0.05,
                      shadowRadius: selected ? 24 : 16,
                      shadowOffset: { width: 0, height: selected ? 6 : 2 },
                      elevation: selected ? 6 : 2,
                      opacity: pressed ? 0.92 : 1,
                    })}
                  >
                    {/* Icon box */}
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: selected ? "#C8F23D" : "#EAE7DF",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActivityIcon
                        glyph={glyph}
                        color={selected ? "#19260A" : "#15140F"}
                      />
                    </View>

                    {/* Text */}
                    <View>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "600",
                          color: selected ? "#FFFFFF" : "#15140F",
                        }}
                      >
                        {title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: selected ? "rgba(255,255,255,0.7)" : "#B6B1A5",
                          marginTop: 2,
                        }}
                      >
                        {sub}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Column 2 */}
            <View style={{ flex: 1, gap: 12 }}>
              {LEVELS.slice(2, 4).map(({ key, title, sub, glyph }) => {
                const selected = level === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setLevel(key)}
                    style={({ pressed }) => ({
                      borderRadius: 20,
                      padding: 18,
                      minHeight: 170,
                      flexDirection: "column",
                      justifyContent: "space-between",
                      backgroundColor: selected ? "#19260A" : "#FFFFFF",
                      shadowColor: "#15140F",
                      shadowOpacity: selected ? 0.18 : 0.05,
                      shadowRadius: selected ? 24 : 16,
                      shadowOffset: { width: 0, height: selected ? 6 : 2 },
                      elevation: selected ? 6 : 2,
                      opacity: pressed ? 0.92 : 1,
                    })}
                  >
                    {/* Icon box */}
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: selected ? "#C8F23D" : "#EAE7DF",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActivityIcon
                        glyph={glyph}
                        color={selected ? "#19260A" : "#15140F"}
                      />
                    </View>

                    {/* Text */}
                    <View>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "600",
                          color: selected ? "#FFFFFF" : "#15140F",
                        }}
                      >
                        {title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: selected ? "rgba(255,255,255,0.7)" : "#B6B1A5",
                          marginTop: 2,
                        }}
                      >
                        {sub}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
