import { View, TextInput, TouchableOpacity, Text } from "react-native";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function WeightInput({ value, onChangeText, onSubmit, loading }: Props) {
  return (
    <View className="flex-row gap-3">
      <TextInput
        className="flex-1 bg-surface rounded-xl px-4 py-3.5 text-lg text-ink"
        placeholder="kg"
        placeholderTextColor="#B6B1A5"
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
      />
      <TouchableOpacity
        className="bg-olive rounded-xl px-5 items-center justify-center"
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text className="text-white font-semibold">Log</Text>
      </TouchableOpacity>
    </View>
  );
}
