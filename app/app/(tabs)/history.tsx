import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import { api } from "@/lib/api";

interface HistoryDay {
  date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; meal_count: number;
}

function HitDot({ color }: { color: string }) {
  return <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

function DayRow({
  day, target, last,
}: { day: HistoryDay; target: number; last?: boolean }) {
  const router = useRouter();
  const d = new Date(`${day.date}T12:00:00`);
  const dayName = d.toLocaleDateString([], { weekday: "short" });
  const monthDay = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const ratio = target > 0 ? day.kcal / target : 0;
  const isOver = ratio > 1.1;
  const isLow = ratio < 0.7;
  const calColor = isOver ? "#D14D3C" : isLow ? "#B6B1A5" : "#19260A";

  return (
    <Pressable
      className={`flex-row items-center px-4 py-3.5 ${last ? "" : "border-b"}`}
      style={({ pressed }) => [
        last ? undefined : { borderBottomColor: "rgba(21,20,15,0.07)", borderBottomWidth: 0.5 },
        pressed && { backgroundColor: "rgba(21,20,15,0.035)" },
      ]}
      onPress={() => router.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathname: "/history/[date]" as any,
        params: {
          date: day.date,
          kcal: String(day.kcal),
          protein_g: String(day.protein_g),
          carbs_g: String(day.carbs_g),
          fat_g: String(day.fat_g),
        },
      })}
    >
      <View className="w-16">
        <Text className="text-xs font-semibold text-ink-mute">{dayName}</Text>
        <Text className="text-sm font-semibold text-ink mt-0.5">{monthDay}</Text>
      </View>
      <View className="flex-1 flex-row gap-1.5 px-3">
        <HitDot color={calColor} />
        <HitDot color="#E1654A" />
        <HitDot color="#E8B339" />
        <HitDot color="#4F8F8A" />
      </View>
      <Text className="text-[15px] font-semibold text-ink">
        {day.kcal.toLocaleString()}<Text className="text-[11px] font-medium text-ink-mute"> kcal</Text>
      </Text>
      <Text className="text-ink-faint text-base ml-2">›</Text>
    </Pressable>
  );
}

function MiniCalBar({ kcal, target, maxKcal }: { kcal: number; target: number; maxKcal: number }) {
  const h = maxKcal > 0 ? Math.round((kcal / maxKcal) * 60) : 0;
  const isOver = kcal > target * 1.1;
  const isLow = kcal < target * 0.7;
  const color = isOver ? "#D14D3C" : isLow ? "#B6B1A5" : "#19260A";
  return (
    <View className="flex-1 items-center justify-end" style={{ height: 60 }}>
      <View className="w-1.5 rounded-sm" style={{ height: Math.max(h, 2), backgroundColor: color, opacity: 0.85 }} />
    </View>
  );
}

interface WeightEntry { logged_at: string; weight_kg: number }
interface HistoryTarget { kcal: number; protein_g: number; carbs_g: number; fat_g: number }

// ----- Weight Trend Chart --------------------------------------------------

function compute7DayMA(points: { x: number; y: number }[]): { x: number; y: number }[] {
  return points.map((pt, i) => {
    const window = points.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, p) => s + p.y, 0) / window.length;
    return { x: pt.x, y: avg };
  });
}

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

function WeightTrendChart({ weights }: { weights: WeightEntry[] }) {
  const [chartWidth, setChartWidth] = useState(300);

  // Deduplicate: keep last entry per calendar day, then sort ascending
  const dayMap = new Map<string, WeightEntry>();
  for (const w of weights) {
    const day = w.logged_at.substring(0, 10);
    dayMap.set(day, w);
  }
  const sorted = Array.from(dayMap.values()).sort((a, b) =>
    a.logged_at.localeCompare(b.logged_at)
  );

  if (sorted.length < 2) {
    return (
      <View
        className="mx-4 mt-5 bg-surface rounded-2xl p-4 items-center py-8"
        style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
      >
        <Text className="text-ink-mute text-sm">Not enough weight data yet</Text>
      </View>
    );
  }

  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 16;
  const PAD_B = 24;
  const chartH = 110;
  const innerW = chartWidth - PAD_L - PAD_R;
  const innerH = chartH - PAD_T - PAD_B;

  const vals = sorted.map((w) => w.weight_kg);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const padding = Math.max((rawMax - rawMin) * 0.25, 0.5);
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;

  const tMin = new Date(sorted[0].logged_at).getTime();
  const tMax = new Date(sorted[sorted.length - 1].logged_at).getTime();
  const tRange = tMax - tMin || 1;

  function toXY(entry: WeightEntry) {
    const t = new Date(entry.logged_at).getTime();
    const x = PAD_L + ((t - tMin) / tRange) * innerW;
    const y = PAD_T + (1 - (entry.weight_kg - yMin) / (yMax - yMin)) * innerH;
    return { x, y };
  }

  const rawPts = sorted.map(toXY);
  const maPts = compute7DayMA(rawPts);

  const rawPath = pointsToPath(rawPts);
  const maPath = pointsToPath(maPts);

  const latest = sorted[sorted.length - 1].weight_kg;
  const first = sorted[0].weight_kg;
  const delta = latest - first;
  const deltaStr = `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)} kg`;
  const deltaBg = delta < 0 ? "#FBEAE3" : delta === 0 ? "#FBF2DC" : "#DFEDEB";
  const deltaTextColor = delta < 0 ? "#E1654A" : delta === 0 ? "#E8B339" : "#4F8F8A";

  const firstLabel = new Date(sorted[0].logged_at).toLocaleDateString([], { month: "short", day: "numeric" });
  const lastLabel = new Date(sorted[sorted.length - 1].logged_at).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <View
      className="mx-4 mt-5 bg-surface rounded-2xl p-4"
      style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#B6B1A5", textTransform: "uppercase", letterSpacing: 0.72 }}>Weight</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 26, fontWeight: "600", color: "#15140F", letterSpacing: -0.5 }}>{latest.toFixed(1)}</Text>
            <Text style={{ fontSize: 13, color: "#B6B1A5" }}>kg</Text>
            {/* Delta pill */}
            <View style={{ marginLeft: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: deltaBg }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: deltaTextColor }}>{deltaStr}</Text>
            </View>
          </View>
        </View>
        {/* Legend */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#B6B1A5" }} />
            <Text style={{ fontSize: 11, color: "#B6B1A5" }}>Daily</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#19260A" }} />
            <Text style={{ fontSize: 11, color: "#B6B1A5" }}>7-day avg</Text>
          </View>
        </View>
      </View>

      {/* SVG chart */}
      <View
        style={{ height: chartH, marginTop: 4 }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        <Svg width={chartWidth} height={chartH}>
          <Defs>
            <LinearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#19260A" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#19260A" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Fill area under raw weight line */}
          {rawPts.length > 0 && (
            <Path
              d={`${rawPath} L${rawPts[rawPts.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${rawPts[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`}
              fill="url(#wGrad)"
            />
          )}

          {/* Raw weight line */}
          <Path d={rawPath} stroke="#19260A" strokeWidth={1.5} strokeOpacity={0.35} fill="none" />

          {/* 7-day MA dashed line */}
          <Path
            d={maPath}
            stroke="#19260A"
            strokeWidth={2}
            strokeDasharray="4,3"
            fill="none"
            strokeOpacity={0.9}
          />

          {/* Dots on raw weight */}
          {rawPts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={2.2} fill="#19260A" fillOpacity={0.35} />
          ))}

          {/* Latest dot — highlighted */}
          {rawPts.length > 0 && (
            <Circle
              cx={rawPts[rawPts.length - 1].x}
              cy={rawPts[rawPts.length - 1].y}
              r={4}
              fill="#19260A"
            />
          )}

          {/* Y axis labels */}
          <SvgText
            x={PAD_L}
            y={PAD_T - 4}
            fontSize={9}
            fill="#B6B1A5"
            textAnchor="start"
          >
            {rawMax.toFixed(1)}
          </SvgText>
          <SvgText
            x={PAD_L}
            y={PAD_T + innerH + 10}
            fontSize={9}
            fill="#B6B1A5"
            textAnchor="start"
          >
            {rawMin.toFixed(1)}
          </SvgText>
        </Svg>
      </View>

      {/* X axis labels */}
      <View className="flex-row justify-between" style={{ marginTop: -4 }}>
        <Text className="text-[11px] text-ink-mute">{firstLabel}</Text>
        <Text className="text-[11px] text-ink-mute">{lastLabel}</Text>
      </View>

    </View>
  );
}

// ---------------------------------------------------------------------------

const PERIODS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

type PeriodDays = typeof PERIODS[number]["days"];

export default function HistoryScreen() {
  const [period, setPeriod] = useState<PeriodDays>(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["history", period],
    queryFn: () => api.history(period) as Promise<{ days: HistoryDay[]; weights: Array<{ logged_at: string; weight_kg: number }>; target: HistoryTarget }>,
    staleTime: 10 * 60_000,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#19260A" />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-warn text-center">Failed to load history</Text>
      </View>
    );
  }

  const days = (data?.days ?? []).slice().reverse();
  const weights = data?.weights ?? [];
  const target = data?.target?.kcal ?? 2000;
  const maxKcal = Math.max(...days.map((d) => d.kcal), target) * 1.05;
  const avgKcal = days.length > 0 ? Math.round(days.reduce((s, d) => s + d.kcal, 0) / days.length) : 0;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Header */}
      <View className="px-5 pt-16 pb-3 flex-row items-center justify-between">
        <Text className="text-[30px] font-bold text-ink" style={{ letterSpacing: -0.6 }}>History</Text>
        {/* Period tabs */}
        <View className="flex-row rounded-full p-0.5"
          style={{ backgroundColor: "#DDD9D0" }}>
          {PERIODS.map(({ label, days }) => (
            <TouchableOpacity
              key={days}
              onPress={() => setPeriod(days)}
              className="rounded-full px-3.5 py-1.5"
              style={period === days ? {
                backgroundColor: "#F1EEE6",
                shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
              } : undefined}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{ color: period === days ? "#15140F" : "#B6B1A5" }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {days.length === 0 ? (
        <View className="items-center py-20 px-8">
          <Text className="text-5xl mb-4">📊</Text>
          <Text className="text-ink-mute text-center text-sm leading-relaxed">
            No history yet{"\n"}Log a few meals to see trends
          </Text>
        </View>
      ) : (
        <>
          {/* Weight trend chart — shown first per design spec */}
          <WeightTrendChart weights={weights} />

          {/* Calorie intake card */}
          <View
            className="mx-4 mt-5 bg-surface rounded-2xl p-4"
            style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest">Calorie intake</Text>
            <View className="flex-row items-baseline gap-1.5 mt-1">
              <Text className="text-[26px] font-semibold text-ink" style={{ letterSpacing: -0.5 }}>
                {avgKcal.toLocaleString()}
              </Text>
              <Text className="text-sm text-ink-mute">avg kcal · target {target.toLocaleString()}</Text>
            </View>
            {/* Mini bar chart */}
            <View className="flex-row items-end mt-3 gap-px" style={{ height: 60 }}>
              {days.slice(-30).map((day, i) => (
                <MiniCalBar key={day.date} kcal={day.kcal} target={target} maxKcal={maxKcal} />
              ))}
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-[11px] text-ink-mute">
                {days.length > 0 ? new Date(days[0].date).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
              </Text>
              <Text className="text-[11px] text-ink-mute">Today</Text>
            </View>
          </View>

          {/* Day list */}
          <View className="px-5 pt-6 pb-2">
            <Text className="text-xs font-bold text-ink-mute uppercase tracking-widest">
              Past {days.length} days
            </Text>
          </View>
          <View
            className="mx-4 bg-surface rounded-2xl overflow-hidden"
            style={{ shadowColor: "#15140F", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
          >
            {days.map((day, i) => (
              <DayRow key={day.date} day={day} target={target} last={i === days.length - 1} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
