import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
  label: string;
  current: number;
  target: number;
  color: string;
  size?: number;
}

export function ProgressRing({ label, current, target, color, size = 72 }: Props) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(current / Math.max(target, 1), 1);
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={6} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={6} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90} origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <Text className="text-xs text-muted mt-1">{label}</Text>
      <Text className="text-xs font-semibold">{Math.round(current)}g</Text>
    </View>
  );
}
