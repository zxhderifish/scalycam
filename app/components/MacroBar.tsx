import { View, Text } from "react-native";

interface Props {
  label: string;
  current: number;
  target: number;
  color: string;
  tintColor?: string;
}

export function MacroBar({ label, current, target, color, tintColor = "#E8E4D8" }: Props) {
  const pct = Math.min((current / Math.max(target, 1)) * 100, 100);
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-sm font-semibold text-ink-2">{label}</Text>
        <Text className="text-xs font-semibold text-ink-2">
          {Math.round(current)}<Text className="text-ink-mute font-normal"> / {target}g</Text>
        </Text>
      </View>
      <View className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: tintColor }}>
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}
