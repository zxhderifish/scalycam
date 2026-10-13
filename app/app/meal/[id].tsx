import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

interface FoodEntry {
  id: string; food_name: string; weight_g: number;
  calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  is_user_edited: boolean; alternative_names: string[] | null; confidence: number | null;
}

interface MealDetail {
  id: string; captured_at: string; total_weight_g: number;
  recognition_status: "pending" | "recognized" | "failed";
  thumbnail_path: string | null; image_path: string | null;
  food_entries: FoodEntry[];
}

function MacroPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-semibold text-ink-2">
        {Math.round(value)}<Text className="text-ink-mute font-normal">g {label}</Text>
      </Text>
    </View>
  );
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [newWeight, setNewWeight] = useState("");

  const { data: meal, isLoading } = useQuery({
    queryKey: ["meal", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("meals")
        .select("*, food_entries(*)")
        .eq("id", id)
        .single();
      return data as MealDetail;
    },
  });

  const swapMutation = useMutation({
    mutationFn: ({ entryId, altIdx }: { entryId: string; altIdx: number }) =>
      api.swapAlternative(entryId, altIdx),
    onSuccess: (updated, { entryId }) => {
      queryClient.setQueryData(["meal", id], (prev: MealDetail | undefined) => {
        if (!prev) return prev;
        return { ...prev, food_entries: prev.food_entries.map((e) => e.id === entryId ? { ...e, ...(updated as object) } : e) };
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, name, weight }: { entryId: string; name: string; weight: number }) =>
      api.updateFoodEntry(entryId, { food_name: name, weight_g: weight }),
    onSuccess: (updated, { entryId }) => {
      queryClient.setQueryData(["meal", id], (prev: MealDetail | undefined) => {
        if (!prev) return prev;
        return { ...prev, food_entries: prev.food_entries.map((e) => e.id === entryId ? { ...e, ...(updated as object) } : e) };
      });
      setEditingEntry(null);
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: () => api.createFoodEntry(id!, newFoodName, parseFloat(newWeight)),
    onSuccess: (entry) => {
      queryClient.setQueryData(["meal", id], (prev: MealDetail | undefined) => {
        if (!prev) return prev;
        return { ...prev, food_entries: [...prev.food_entries, entry as unknown as FoodEntry], recognition_status: "recognized" };
      });
      setShowAddForm(false);
      setNewFoodName(""); setNewWeight("");
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => api.reidentifyMeal(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meal", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await supabase.from("meals").delete().eq("id", id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today_summary"] });
      router.back();
    },
  });

  if (isLoading || !meal) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#19260A" />
      </View>
    );
  }

  const thumbUrl = meal.thumbnail_path
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/thumbnails/${meal.thumbnail_path}`
    : null;

  const capturedAt = new Date(meal.captured_at);
  const time = capturedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hour = capturedAt.getHours();
  const mealType =
    hour >= 5  && hour < 10 ? "Breakfast" :
    hour >= 10 && hour < 12 ? "Morning snack" :
    hour >= 12 && hour < 14 ? "Lunch" :
    hour >= 14 && hour < 17 ? "Afternoon snack" :
    hour >= 17 && hour < 21 ? "Dinner" : "Late night";
  const totalKcal = meal.food_entries.reduce((s, e) => s + e.calories_kcal, 0);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top bar */}
      <View className="flex-row items-center px-4 pt-14 pb-3.5 bg-bg" style={{ gap: 8 }}>
        <TouchableOpacity
          className="w-[38px] h-[38px] rounded-full bg-surface items-center justify-center"
          style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
          onPress={() => router.back()}
        >
          <Text className="text-ink text-lg">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-[17px] font-semibold text-ink text-center" style={{ letterSpacing: -0.3 }}>
          {mealType} · {time}
        </Text>
        <View className="w-[38px]" />
      </View>

      <View className="px-4">
        {/* Thumbnail */}
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            className="w-full rounded-2xl"
            style={{ aspectRatio: 16 / 10 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full rounded-2xl bg-ink items-center justify-center"
            style={{ aspectRatio: 16 / 10 }}
          >
            <Text className="text-5xl">📸</Text>
          </View>
        )}

        {/* Failed banner */}
        {meal.recognition_status === "failed" && (
          <View className="mt-4 bg-warn-tint rounded-2xl p-4 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-warn items-center justify-center">
              <Text className="text-white text-sm">!</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-warn">Recognition failed</Text>
              <Text className="text-[12.5px] text-ink-2 mt-0.5">The camera couldn't identify what's on the scale.</Text>
            </View>
          </View>
        )}

        {/* Totals */}
        <View className="flex-row items-center gap-4 mt-5 px-2">
          <View>
            <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest">Total</Text>
            <View className="flex-row items-end gap-1 mt-0.5">
              <Text className="text-[32px] font-semibold text-ink" style={{ letterSpacing: -1, lineHeight: 36 }}>
                {meal.total_weight_g}
              </Text>
              <Text className="text-sm text-ink-mute mb-1">g</Text>
            </View>
          </View>
          <View className="w-px h-9 bg-black opacity-[0.07]" />
          <View>
            <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest">Calories</Text>
            <View className="flex-row items-end gap-1 mt-0.5">
              <Text className="text-[32px] font-semibold text-ink" style={{ letterSpacing: -1, lineHeight: 36 }}>
                {Math.round(totalKcal)}
              </Text>
              <Text className="text-sm text-ink-mute mb-1">kcal</Text>
            </View>
          </View>
        </View>

        {/* Food entries */}
        {meal.food_entries.length > 0 && (
          <View className="mt-5 gap-2">
            {meal.food_entries.map((entry) => (
              <View
                key={entry.id}
                className="bg-surface rounded-2xl p-3.5"
                style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
              >
                {editingEntry === entry.id ? (
                  <View>
                    <TextInput
                      className="bg-surface-2 rounded-xl px-3 py-2.5 mb-2 text-sm text-ink"
                      value={editName}
                      onChangeText={setEditName}
                      style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
                    />
                    <TextInput
                      className="bg-surface-2 rounded-xl px-3 py-2.5 mb-3 text-sm text-ink"
                      value={editWeight}
                      onChangeText={setEditWeight}
                      keyboardType="decimal-pad"
                      placeholder="Weight (g)"
                      style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
                    />
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 bg-olive rounded-full py-2.5 items-center"
                        onPress={() => updateMutation.mutate({ entryId: entry.id, name: editName, weight: parseFloat(editWeight) })}
                      >
                        <Text className="text-white font-semibold text-sm">Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-surface-dim rounded-full py-2.5 items-center"
                        onPress={() => setEditingEntry(null)}
                      >
                        <Text className="text-ink-2 font-semibold text-sm">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row items-center gap-3">
                      <View className="w-[42px] h-[42px] rounded-xl bg-surface-2 items-center justify-center">
                        <Text className="text-2xl">🍽</Text>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-[15px] font-semibold text-ink">{entry.food_name}</Text>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <Text className="text-xs text-ink-mute">{entry.weight_g}g</Text>
                          <Text className="text-ink-faint">·</Text>
                          <Text className="text-xs font-semibold text-ink">{Math.round(entry.calories_kcal)} kcal</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-2"
                        onPress={() => { setEditingEntry(entry.id); setEditName(entry.food_name); setEditWeight(String(entry.weight_g)); }}
                      >
                        <Text className="text-xs font-semibold text-ink-2">Change ›</Text>
                      </TouchableOpacity>
                    </View>
                    {/* macro stripe */}
                    <View className="flex-row gap-3 mt-2.5 ml-[54px]">
                      <MacroPill value={entry.protein_g} label="P" color="#E1654A" />
                      <MacroPill value={entry.carbs_g} label="C" color="#E8B339" />
                      <MacroPill value={entry.fat_g} label="F" color="#4F8F8A" />
                    </View>
                    {/* alternative names */}
                    {entry.alternative_names && entry.alternative_names.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 mt-2.5 ml-[54px]">
                        {entry.alternative_names.slice(0, 3).map((alt, idx) => (
                          <TouchableOpacity
                            key={idx}
                            className="bg-surface-dim px-2.5 py-1 rounded-full"
                            onPress={() => swapMutation.mutate({ entryId: entry.id, altIdx: idx })}
                          >
                            <Text className="text-xs text-ink-2 font-medium">{alt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Failed empty state */}
        {meal.recognition_status === "failed" && meal.food_entries.length === 0 && (
          <View className="mt-4 bg-surface rounded-2xl p-6 items-center"
            style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <Text className="text-[15px] font-semibold text-ink">No items yet</Text>
            <Text className="text-[13px] text-ink-mute mt-1 text-center leading-relaxed">
              Retry recognition, or add{"\n"}what's on the scale by hand.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="mt-5 gap-2.5">
          {meal.recognition_status === "failed" && meal.image_path && (
            <TouchableOpacity
              className="bg-olive rounded-full py-4 items-center flex-row justify-center gap-2"
              onPress={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              {retryMutation.isPending
                ? <ActivityIndicator color="#C8F23D" />
                : <Text className="text-white font-semibold text-[16px]">↺ Retry recognition</Text>
              }
            </TouchableOpacity>
          )}

          {!showAddForm && (
            <TouchableOpacity
              className="rounded-full py-3.5 items-center flex-row justify-center gap-2"
              style={{ borderWidth: 1.5, borderColor: "rgba(21,20,15,0.14)" }}
              onPress={() => setShowAddForm(true)}
            >
              <Text className="text-ink font-semibold text-[16px]">+ Add item manually</Text>
            </TouchableOpacity>
          )}

          {showAddForm && (
            <View
              className="bg-surface rounded-2xl p-4"
              style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            >
              <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-1.5">Food name</Text>
              <TextInput
                className="bg-surface-2 rounded-xl px-3 py-2.5 mb-3 text-sm text-ink"
                placeholder="e.g. Brown rice"
                placeholderTextColor="#B6B1A5"
                value={newFoodName}
                onChangeText={setNewFoodName}
                style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
              />
              <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-1.5">Weight (g)</Text>
              <TextInput
                className="bg-surface-2 rounded-xl px-3 py-2.5 mb-4 text-sm text-ink"
                placeholder="e.g. 150"
                placeholderTextColor="#B6B1A5"
                value={newWeight}
                onChangeText={setNewWeight}
                keyboardType="decimal-pad"
                style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 bg-olive rounded-full py-3 items-center"
                  onPress={() => addEntryMutation.mutate()}
                  disabled={addEntryMutation.isPending}
                >
                  {addEntryMutation.isPending
                    ? <ActivityIndicator color="#C8F23D" />
                    : <Text className="text-white font-semibold">Add</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-surface-dim rounded-full py-3 items-center"
                  onPress={() => setShowAddForm(false)}
                >
                  <Text className="text-ink-2 font-semibold">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Delete */}
        <TouchableOpacity
          className="mt-8 py-2 items-center"
          onPress={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending
            ? <ActivityIndicator color="#D14D3C" />
            : <Text className="text-warn text-sm font-semibold">Delete meal</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
