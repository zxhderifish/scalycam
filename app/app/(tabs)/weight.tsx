import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Svg, { Path, Circle } from "react-native-svg";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/auth";
import { api } from "@/lib/api";

interface WeightLog { id: string; weight_kg: number; logged_at: string; }

const PAD_KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"] as const;

function MiniWeightChart({ logs }: { logs: Array<{logged_at: string; weight_kg: number}> }) {
  const [chartWidth, setChartWidth] = useState(280);

  if (!logs || logs.length < 2) return null;

  // Sort ascending
  const sorted = [...logs].reverse(); // logs are desc, reverse to asc

  const PAD = 8;
  const chartH = 80;
  const innerW = chartWidth - PAD * 2;
  const innerH = chartH - PAD * 2;

  const vals = sorted.map(w => w.weight_kg);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const range = Math.max(rawMax - rawMin, 0.5);
  const yMin = rawMin - range * 0.15;
  const yMax = rawMax + range * 0.15;

  function toXY(entry: {logged_at: string; weight_kg: number}, idx: number) {
    const x = PAD + (idx / (sorted.length - 1)) * innerW;
    const y = PAD + (1 - (entry.weight_kg - yMin) / (yMax - yMin)) * innerH;
    return { x, y };
  }

  const pts = sorted.map(toXY);

  // 7-day MA
  const maPts = pts.map((_, i) => {
    const win = pts.slice(Math.max(0, i - 6), i + 1);
    const avg = win.reduce((s, p) => s + p.y, 0) / win.length;
    return { x: pts[i].x, y: avg };
  });

  const rawPath = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const maPath = maPts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <View className="mx-4 mt-5 bg-surface rounded-2xl p-4"
      style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest">Past 30 days</Text>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#19260A" }} />
          <Text className="text-[11px] text-ink-mute">7-day avg</Text>
        </View>
      </View>
      <View style={{ height: chartH }} onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
        <Svg width={chartWidth} height={chartH}>
          {/* raw dots */}
          {pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={1.8} fill="#19260A" fillOpacity={0.3} />)}
          {/* 7d MA line */}
          <Path d={maPath} stroke="#19260A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* latest highlight */}
          <Circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={5} fill="#C8F23D" stroke="#19260A" strokeWidth={2} />
        </Svg>
      </View>
    </View>
  );
}

export default function WeightScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: logs } = useQuery({
    queryKey: ["weight_logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("logged_at", { ascending: false })
        .limit(30);
      return (data ?? []) as WeightLog[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000, // weight logs: 5 min
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("weight_logs").delete().eq("id", id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weight_logs"] }),
  });

  function handleKey(k: string) {
    if (k === "⌫") { setValue((v) => v.slice(0, -1)); return; }
    if (k === "." && value.includes(".")) return;
    if (value.length >= 5) return;
    setValue((v) => v + k);
  }

  async function save() {
    const kg = parseFloat(value);
    if (!kg || kg < 20 || kg > 500) return;
    setSaving(true);
    try {
      await api.logWeight(kg);
      queryClient.invalidateQueries({ queryKey: ["weight_logs"] });
      setValue("");
    } finally { setSaving(false); }
  }

  const lastLog = logs?.[0];
  const diff = lastLog && value
    ? (parseFloat(value) - lastLog.weight_kg).toFixed(1)
    : null;

  const today = new Date();
  const dayLabel = today.toLocaleDateString([], { weekday: "short" });

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={logs ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 8 }}
        ListHeaderComponent={() => (
          <View>
            {/* Top bar */}
            <View className="px-5 pt-16 pb-2">
              <Text className="text-[30px] font-bold text-ink" style={{ letterSpacing: -0.6 }}>Log weight</Text>
            </View>

            {/* Big value display */}
            <View className="px-6 pt-2 pb-5 items-center">
              <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-3.5">
                Today · {dayLabel}
              </Text>
              <View
                className="flex-row items-end gap-2 pb-2 border-b-2 border-olive"
              >
                <Text className="text-ink font-medium" style={{ fontSize: 76, lineHeight: 76, letterSpacing: -3 }}>
                  {value || "0"}
                </Text>
                <Text className="text-ink-mute font-medium text-[22px] mb-1.5">kg</Text>
              </View>
              {diff !== null && (
                <Text className="text-xs text-ink-mute mt-2">
                  yesterday: {lastLog!.weight_kg} kg ·{" "}
                  <Text style={{ color: parseFloat(diff) <= 0 ? "#E1654A" : "#8A857A" }}>
                    {parseFloat(diff) <= 0 ? "↓" : "↑"} {Math.abs(parseFloat(diff))} kg
                  </Text>
                </Text>
              )}
            </View>

            {/* Mini trend chart */}
            <MiniWeightChart logs={logs ?? []} />

            {/* Recent heading */}
            {(logs?.length ?? 0) > 0 && (
              <View className="px-5 pt-2 pb-2">
                <Text className="text-xs font-bold text-ink-mute uppercase tracking-widest">Recent</Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item, index }) => (
          <View
            className={`mx-4 bg-surface flex-row items-center justify-between px-4 py-3.5 ${index === 0 ? "rounded-t-2xl" : ""} ${index === (logs?.length ?? 0) - 1 ? "rounded-b-2xl mb-4" : "border-b"}`}
            style={index === (logs?.length ?? 0) - 1
              ? { shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
              : { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 }}
          >
            <Text className="text-sm font-medium text-ink">
              {new Date(item.logged_at).toLocaleDateString([], { month: "short", day: "numeric", year: undefined })}
            </Text>
            <View className="flex-row items-center gap-4">
              <Text className="text-[15px] font-semibold text-ink">
                {item.weight_kg}{" "}
                <Text className="text-xs font-medium text-ink-mute">kg</Text>
              </Text>
              <TouchableOpacity
                onPress={() => deleteMutation.mutate(item.id)}
                className="px-2.5 py-1 rounded-full bg-warn-tint"
              >
                <Text className="text-xs font-semibold text-warn">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text className="text-ink-mute text-center py-8 px-8 text-sm">
            Track your weight to see trends.
          </Text>
        )}
      />

      {/* Decimal pad */}
      <View
        className="bg-bg-warm pt-2.5 pb-7 px-1.5"
        style={{ borderTopWidth: 0.5, borderTopColor: "rgba(21,20,15,0.1)" }}
      >
        <View className="flex-row flex-wrap" style={{ gap: 0 }}>
          {[["1","2","3"],["4","5","6"],["7","8","9"],[".","0","⌫"]].map((row, ri) => (
            <View key={ri} className="flex-row w-full" style={{ gap: 8, marginBottom: 8, paddingHorizontal: 6 }}>
              {row.map((k) => (
                <TouchableOpacity
                  key={k}
                  className="flex-1 items-center justify-center bg-surface rounded-xl"
                  style={{ height: 48, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
                  onPress={() => handleKey(k)}
                  activeOpacity={0.7}
                >
                  <Text className="text-ink text-[26px] font-normal">{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
        <TouchableOpacity
          className="mx-1.5 mt-2 bg-olive rounded-xl items-center justify-center"
          style={{ height: 48 }}
          onPress={save}
          disabled={saving || !value}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color="#C8F23D" />
            : <Text className="text-white text-base font-semibold">Save</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
