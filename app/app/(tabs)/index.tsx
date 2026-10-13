import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/auth";
import { api } from "@/lib/api";
import { MealCard } from "@/components/MealCard";
import { mmkvGet, mmkvSet } from "@/lib/persist/mmkv";
import { requestPushPermission } from "@/lib/push";

interface TodaySummary {
  date: string;
  intake: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  target: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  remaining: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  meals: Array<{
    id: string; captured_at: string; total_weight_g: number;
    total_kcal: number; recognition_status: "pending" | "recognized" | "failed"; item_names: string[];
  }>;
}

function MacroBar({
  name, current, target, color, tintColor,
}: { name: string; current: number; target: number; color: string; tintColor: string }) {
  const pct = Math.min(1, target > 0 ? current / target : 0);
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Text className="text-ink-2 font-semibold text-sm w-16">{name}</Text>
      <View className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: tintColor }}>
        <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </View>
      <View className="w-20 items-end">
        <Text className="text-xs font-semibold" style={{ color: "#15140F" }}>
          {current}<Text className="text-ink-mute font-normal"> / {target}g</Text>
        </Text>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["today_summary"],
    queryFn: () => api.todaySummary() as Promise<TodaySummary>,
    // staleTime from QueryClient default (2 min); show cached data while refetching
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`meals:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meals", filter: `user_id=eq.${user.id}` }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["today_summary"] });
        if ((payload.new as { recognition_status?: string })?.recognition_status === "recognized" ||
            (payload.new as { recognition_status?: string })?.recognition_status === "failed") {
          queryClient.invalidateQueries({ queryKey: ["meal", (payload.new as { id: string }).id] });
        }
        if ((payload.new as { recognition_status?: string })?.recognition_status === "recognized") {
          const hasAsked = mmkvGet<boolean>("push_permission_asked");
          if (!hasAsked) {
            mmkvSet("push_permission_asked", true);
            requestPushPermission();
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const target = data?.target ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const intake = data?.intake ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const remaining = data?.remaining?.kcal ?? target.kcal;
  const eatPct = target.kcal > 0 ? Math.min(1, intake.kcal / target.kcal) : 0;

  const today = new Date();
  const dayLabel = today.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg px-5 pt-16">
        <View className="h-3 bg-surface-dim rounded-full w-1/3 mb-3" />
        <View className="h-20 bg-surface-dim rounded-full w-2/3 mb-6" />
        <View className="bg-surface rounded-2xl p-4 mb-3">
          <View className="h-3 bg-surface-dim rounded-full w-full mb-3" />
          <View className="h-3 bg-surface-dim rounded-full w-full mb-3" />
          <View className="h-3 bg-surface-dim rounded-full w-full" />
        </View>
        <ActivityIndicator color="#19260A" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        className="flex-1 bg-bg"
        contentContainerClassName="pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#19260A" />}
        ListHeaderComponent={() => (
          <View>
            {/* Header strip */}
            <View className="flex-row items-center justify-between px-5 pt-16">
              <View>
                <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest">{dayLabel}</Text>
                <Text className="text-2xl font-bold text-ink mt-0.5" style={{ letterSpacing: -0.5 }}>Today</Text>
              </View>
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-surface rounded-full"
                style={{ shadowColor: "#15140F", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                <View className="w-2 h-2 rounded-full bg-ok" style={{ shadowColor: "#4A8C4A", shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } }} />
                <Text className="text-xs font-semibold text-ink-2">Scale ready</Text>
              </View>
            </View>

            {isError && (
              <View className="mx-5 mt-4 bg-warn-tint rounded-xl px-4 py-3">
                <Text className="text-warn text-sm">
                  Couldn't reach ScalyCam ·{" "}
                  <Text className="font-semibold" onPress={() => refetch()}>Retry</Text>
                </Text>
              </View>
            )}

            {/* Hero — calories remaining */}
            <View className="px-5 pt-7">
              <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-1">Calories left</Text>
              <View className="flex-row items-end gap-2">
                <Text className="text-ink font-medium" style={{ fontSize: 76, lineHeight: 76, letterSpacing: -3 }}>
                  {Math.max(0, Math.round(remaining))}
                </Text>
                <Text className="text-ink-mute font-medium text-lg mb-2">/ {target.kcal} kcal</Text>
              </View>
              {/* slim track */}
              <View className="mt-3.5 h-1.5 rounded-full bg-surface-dim overflow-hidden">
                <View className="h-full bg-olive rounded-full" style={{ width: `${eatPct * 100}%` }} />
              </View>
              <View className="flex-row justify-between mt-1.5">
                <Text className="text-xs text-ink-mute">{Math.round(intake.kcal)} eaten</Text>
                <Text className="text-xs text-ink-mute">{Math.round(eatPct * 100)}% of goal</Text>
              </View>
            </View>

            {/* Macros card */}
            <View className="mx-4 mt-5 bg-surface rounded-2xl px-[18px]"
              style={{ shadowColor: "#15140F", shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
              <MacroBar name="Protein" current={Math.round(intake.protein_g)} target={target.protein_g} color="#E1654A" tintColor="#FBEAE3" />
              <View className="h-px bg-black opacity-[0.06]" />
              <MacroBar name="Carbs" current={Math.round(intake.carbs_g)} target={target.carbs_g} color="#E8B339" tintColor="#FBEFD5" />
              <View className="h-px bg-black opacity-[0.06]" />
              <MacroBar name="Fat" current={Math.round(intake.fat_g)} target={target.fat_g} color="#4F8F8A" tintColor="#DFEDEB" />
            </View>

            {/* Meals heading */}
            <View className="flex-row items-baseline justify-between px-5 pt-6 pb-2.5">
              <Text className="text-[17px] font-semibold text-ink" style={{ letterSpacing: -0.2 }}>Meals</Text>
              <Text className="text-sm text-ink-mute">{data?.meals?.length ?? 0} today</Text>
            </View>
          </View>
        )}
        data={data?.meals ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4 mb-2.5">
            <MealCard meal={item} />
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-12 px-8">
            <Text className="text-5xl mb-4">🍽</Text>
            <Text className="text-ink-mute text-center text-sm leading-relaxed">
              Place food on the scale{"\n"}to get started
            </Text>
          </View>
        )}
      />
      {/* Log weight FAB */}
      <View style={{ position: "absolute", right: 18, bottom: 28 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            height: 52, paddingLeft: 14, paddingRight: 18,
            borderRadius: 999, backgroundColor: "#19260A",
            shadowColor: "#19260A", shadowOpacity: 0.5, shadowRadius: 28,
            shadowOffset: { width: 0, height: 10 }, elevation: 8,
          }}
          onPress={() => router.push("/(tabs)/weight" as any)}
          activeOpacity={0.85}
        >
          <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: "#C8F23D", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>⚖</Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Log weight</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
