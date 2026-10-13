import { View, DimensionValue } from "react-native";

export function SkeletonRow({ width = "100%" }: { width?: DimensionValue }) {
  return <View className="h-4 bg-surface-dim rounded-full mb-2" style={{ width }} />;
}
