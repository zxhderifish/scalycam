import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSettingsStore } from "@/lib/store/settings";

const OLIVE = "#19260A";
const INK = "#15140F";
const INK_MUTE = "#B6B1A5";
const SURFACE = "#FFFFFF";
const BG = "#F1EEE6";

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 32 }}>
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

export default function BasicsScreen() {
  const router = useRouter();
  const { update } = useSettingsStore();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"female" | "male" | "other">("female");

  async function next() {
    await update({
      height_cm: parseFloat(height) || null,
      weight_kg: parseFloat(weight) || null,
      age: parseInt(age) || null,
      sex,
    });
    router.push("/(auth)/onboarding/goal" as any);
  }

  const fields: {
    label: string;
    value: string;
    set: (v: string) => void;
    keyboard: "numeric" | "decimal-pad";
    unit: string;
  }[] = [
    { label: "Height", value: height, set: setHeight, keyboard: "numeric", unit: "cm" },
    { label: "Weight", value: weight, set: setWeight, keyboard: "decimal-pad", unit: "kg" },
    { label: "Age", value: age, set: setAge, keyboard: "numeric", unit: "yrs" },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 70, paddingHorizontal: 24, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress dots: step 1 of 4 */}
        <ProgressDots step={1} total={4} />

        {/* Heading */}
        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            color: INK,
            letterSpacing: -0.5,
            marginBottom: 8,
          }}
        >
          Tell us about you
        </Text>
        <Text style={{ fontSize: 15, color: INK_MUTE, marginBottom: 32 }}>
          We'll use this to set your daily targets.
        </Text>

        {/* Numeric field cards */}
        <View style={{ gap: 14 }}>
          {fields.map(({ label, value, set, keyboard, unit }) => (
            <View
              key={label}
              style={{
                backgroundColor: SURFACE,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: INK, flex: 1 }}>
                {label}{" "}
                <Text style={{ color: INK_MUTE, fontWeight: "400", fontSize: 13 }}>({unit})</Text>
              </Text>
              <TextInput
                value={value}
                onChangeText={set}
                keyboardType={keyboard}
                placeholder="—"
                placeholderTextColor={INK_MUTE}
                textAlign="right"
                style={{
                  fontSize: 22,
                  fontWeight: "600",
                  fontVariant: ["tabular-nums"],
                  color: INK,
                  minWidth: 80,
                }}
              />
            </View>
          ))}

          {/* Sex picker card */}
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 16,
              padding: 14,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: INK,
                marginBottom: 10,
              }}
            >
              Sex
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["Female", "Male", "Other"] as const).map((label) => {
                const val = label.toLowerCase() as "female" | "male" | "other";
                const active = sex === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setSex(val)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? OLIVE : "#EEEBE4",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: active ? SURFACE : INK,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Spacer so sticky button doesn't overlap last card */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky bottom button */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: Platform.OS === "ios" ? 40 : 24,
          paddingTop: 12,
          backgroundColor: BG,
        }}
      >
        <TouchableOpacity
          onPress={next}
          activeOpacity={0.85}
          style={{
            backgroundColor: OLIVE,
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: SURFACE, fontWeight: "600", fontSize: 16 }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
