import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

interface MealSummary {
  id: string;
  captured_at: string;
  total_kcal: number;
  recognition_status: "pending" | "recognized" | "failed";
  item_names: string[];
}

// Assign a pastel background + emoji to a food name based on keywords
function foodChip(name: string): { bg: string; emoji: string } {
  const n = name.toLowerCase();
  if (/egg|omelet|scrambl/.test(n))      return { bg: "#FFF5CC", emoji: "🥚" };
  if (/chicken|turkey|poultry/.test(n))  return { bg: "#FFE8DC", emoji: "🍗" };
  if (/beef|steak|burger|meat/.test(n))  return { bg: "#FFDDD5", emoji: "🥩" };
  if (/fish|salmon|tuna|shrimp/.test(n)) return { bg: "#D5EEF4", emoji: "🐟" };
  if (/rice|pasta|noodle/.test(n))       return { bg: "#FFF3E0", emoji: "🍚" };
  if (/bread|toast|bagel/.test(n))       return { bg: "#FDEBD0", emoji: "🍞" };
  if (/salad|lettuce|spinach/.test(n))   return { bg: "#E8F5E3", emoji: "🥗" };
  if (/broccoli|veggie|vegetable|bok/.test(n)) return { bg: "#DFF0D8", emoji: "🥦" };
  if (/yogurt|milk|cheese|dairy/.test(n)) return { bg: "#F0EEFF", emoji: "🥛" };
  if (/fruit|banana|apple|berry|orange/.test(n)) return { bg: "#FFF0F5", emoji: "🍎" };
  if (/oat|granola|cereal/.test(n))      return { bg: "#FDF2E0", emoji: "🥣" };
  if (/soup|stew/.test(n))               return { bg: "#FFF3DC", emoji: "🍲" };
  if (/juice|smoothie|drink/.test(n))    return { bg: "#E8F4FF", emoji: "🥤" };
  return { bg: "#F0EDE6", emoji: "🍽" };
}

// Three stacked food thumbnails
function StackedThumbs({ names }: { names: string[] }) {
  const chips = (names.length > 0 ? names : ["Meal"])
    .slice(0, 3)
    .map(foodChip);

  return (
    <View style={{ width: 60, height: 52, flexShrink: 0 }}>
      {chips.map((chip, i) => {
        const rotations = [-5, 3, -2];
        const lefts = [0, 10, 20];
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: lefts[i] ?? i * 10,
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: chip.bg,
              alignItems: "center",
              justifyContent: "center",
              zIndex: chips.length - i,
              transform: [{ rotate: `${rotations[i] ?? 0}deg` }],
              // white border like the mock
              borderWidth: 2,
              borderColor: "#FFFFFF",
            }}
          >
            <Text style={{ fontSize: 20 }}>{chip.emoji}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function MealCard({ meal }: { meal: MealSummary }) {
  const router = useRouter();
  const time = new Date(meal.captured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (meal.recognition_status === "pending") {
    return (
      <View
        className="bg-surface rounded-2xl px-3.5 py-3.5 flex-row items-center gap-3"
        style={{ shadowColor: "#15140F", shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        {/* shimmer thumb area */}
        <View style={{ width: 60, height: 52, flexShrink: 0 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                position: "absolute", top: 0, left: i * 10,
                width: 42, height: 42, borderRadius: 12,
                backgroundColor: "#F0EDE6",
                borderWidth: 2, borderColor: "#FFFFFF",
                zIndex: 3 - i,
              }}
            />
          ))}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-2">
            <View className="w-4 h-4 rounded-full bg-olive items-center justify-center">
              <Text className="text-lime text-[8px] font-bold">✦</Text>
            </View>
            <Text className="text-sm font-semibold text-ink">Recognizing…</Text>
            <Text className="text-xs text-ink-mute ml-auto">{time}</Text>
          </View>
          <View className="h-2 rounded-full bg-surface-dim w-3/4 mb-1.5" />
          <View className="h-2 rounded-full bg-surface-dim w-1/2" />
        </View>
        <ActivityIndicator size="small" color="#8A857A" />
      </View>
    );
  }

  if (meal.recognition_status === "failed") {
    return (
      <TouchableOpacity
        className="bg-surface rounded-2xl px-3.5 py-3.5 flex-row items-center gap-3"
        style={{ borderWidth: 1.5, borderColor: "#F9E5E2", shadowColor: "#15140F", shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
        onPress={() => router.push(`/meal/${meal.id}` as any)}
        activeOpacity={0.7}
      >
        <View className="w-11 h-11 rounded-xl bg-warn-tint items-center justify-center">
          <Text className="text-warn text-lg">⚠</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-ink-mute">{time}</Text>
          <Text className="text-sm font-semibold text-warn mt-0.5">Recognition failed</Text>
          <Text className="text-xs text-ink-mute mt-0.5">Tap to retry</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // recognized
  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl px-3.5 py-3 flex-row items-center gap-3"
      style={{ shadowColor: "#15140F", shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      onPress={() => router.push(`/meal/${meal.id}` as any)}
      activeOpacity={0.7}
    >
      <StackedThumbs names={meal.item_names} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-baseline">
          <Text className="text-xs font-semibold text-ink-mute">{time}</Text>
          <Text className="text-sm font-bold text-ink ml-auto">
            {Math.round(meal.total_kcal)}
            <Text className="text-xs font-medium text-ink-mute"> kcal</Text>
          </Text>
        </View>
        <Text className="text-sm font-medium text-ink mt-1" numberOfLines={1}>
          {meal.item_names.join(" · ") || "Meal"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
