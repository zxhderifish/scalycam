import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface FoodEntry {
  food_name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Meal {
  id: string;
  captured_at: string;
  total_weight_g: number;
  recognition_status: string;
  food_entries: FoodEntry[];
}

function MacroPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-semibold text-ink">
        {Math.round(value)}<Text className="text-ink-mute font-normal">g {label}</Text>
      </Text>
    </View>
  );
}

export default function DayDetailScreen() {
  const { date, kcal, protein_g, carbs_g, fat_g } = useLocalSearchParams<{
    date: string;
    kcal: string;
    protein_g: string;
    carbs_g: string;
    fat_g: string;
  }>();
  const router = useRouter();

  // Date label — e.g. "Monday, May 26"
  const dateObj = new Date(`${date}T12:00:00`);
  const dateLabel = dateObj.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  // Fetch meals for this day
  const dayStart = new Date(`${date}T00:00:00`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();

  const { data: meals, isLoading } = useQuery({
    queryKey: ["day-meals", date],
    queryFn: async () => {
      const { data } = await supabase
        .from("meals")
        .select("id, captured_at, total_weight_g, recognition_status, food_entries(food_name, calories_kcal, protein_g, carbs_g, fat_g)")
        .gte("captured_at", dayStart)
        .lte("captured_at", dayEnd)
        .order("captured_at", { ascending: true });
      return (data ?? []) as Meal[];
    },
    staleTime: 5 * 60_000,
  });

  const totalKcal = Number(kcal) || 0;
  const totalProtein = Number(protein_g) || 0;
  const totalCarbs = Number(carbs_g) || 0;
  const totalFat = Number(fat_g) || 0;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Top bar */}
      <View className="flex-row items-center px-4 pt-14 pb-3.5" style={{ gap: 8 }}>
        <TouchableOpacity
          className="w-[38px] h-[38px] rounded-full bg-surface items-center justify-center"
          style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
          onPress={() => router.back()}
        >
          <Text className="text-ink text-lg">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-semibold text-ink text-center" style={{ letterSpacing: -0.3 }}>
          {dateLabel}
        </Text>
        <View className="w-[38px]" />
      </View>

      {/* Day totals card */}
      <View
        className="mx-4 mt-2 bg-surface rounded-2xl p-4"
        style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
      >
        <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest">Day total</Text>
        <View className="flex-row items-end gap-1.5 mt-1">
          <Text className="text-[34px] font-semibold text-ink" style={{ letterSpacing: -1, lineHeight: 40 }}>
            {totalKcal.toLocaleString()}
          </Text>
          <Text className="text-sm text-ink-mute mb-1.5">kcal</Text>
        </View>
        <View className="flex-row gap-4 mt-2">
          <MacroPill value={totalProtein} label="protein" color="#E1654A" />
          <MacroPill value={totalCarbs} label="carbs" color="#E8B339" />
          <MacroPill value={totalFat} label="fat" color="#4F8F8A" />
        </View>
      </View>

      {/* Meals list */}
      <View className="px-5 pt-6 pb-2">
        <Text className="text-xs font-bold text-ink-mute uppercase tracking-widest">Meals</Text>
      </View>

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#19260A" />
        </View>
      ) : meals && meals.length > 0 ? (
        <View
          className="mx-4 bg-surface rounded-2xl overflow-hidden"
          style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        >
          {meals.map((meal, i) => {
            const time = new Date(meal.captured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const mealKcal = meal.food_entries.reduce((s, e) => s + (e.calories_kcal ?? 0), 0);
            const names = meal.food_entries.map((e) => e.food_name).join(", ");
            const isLast = i === meals.length - 1;

            return (
              <TouchableOpacity
                key={meal.id}
                className={`flex-row items-center px-4 py-3.5 ${isLast ? "" : "border-b"}`}
                style={isLast ? undefined : { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 }}
                onPress={() => router.push(`/meal/${meal.id}`)}
                activeOpacity={0.65}
              >
                {/* Time */}
                <View className="w-14">
                  <Text className="text-sm font-semibold text-ink">{time}</Text>
                </View>

                {/* Names */}
                <View className="flex-1 px-2 min-w-0">
                  {names ? (
                    <Text className="text-[13.5px] text-ink-2" numberOfLines={1}>{names}</Text>
                  ) : (
                    <Text className="text-[13.5px] text-ink-mute italic">
                      {meal.recognition_status === "failed" ? "Recognition failed" : "Pending…"}
                    </Text>
                  )}
                  <Text className="text-xs text-ink-mute mt-0.5">{meal.total_weight_g}g total</Text>
                </View>

                {/* Kcal */}
                <Text className="text-[15px] font-semibold text-ink">
                  {Math.round(mealKcal).toLocaleString()}
                  <Text className="text-[11px] font-medium text-ink-mute"> kcal</Text>
                </Text>
                <Text className="text-ink-faint text-base ml-2">›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View className="mx-4 bg-surface rounded-2xl p-8 items-center"
          style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <Text className="text-ink-mute text-sm">No meals recorded this day</Text>
        </View>
      )}
    </ScrollView>
  );
}
