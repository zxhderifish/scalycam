import { create } from "zustand";
import { supabase } from "../supabase";

export interface UserSettings {
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  activity_level: number | null;
  goal: "lose" | "maintain" | "gain" | null;
  daily_calorie_target: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  timezone: string;
  notification_prefs: { evening_recap: boolean; per_meal: boolean; errors_only: boolean };
}

interface SettingsState {
  settings: UserSettings | null;
  loading: boolean;
  fetch: () => Promise<void>;
  update: (partial: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  fetch: async () => {
    set({ loading: true });
    const { data } = await supabase.from("user_settings").select("*").single();
    set({ settings: data ?? null, loading: false });
  },
  update: async (partial) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { data } = await supabase.from("user_settings").upsert({ user_id: userId, ...partial, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select().single();
    set((s) => ({ settings: { ...(s.settings ?? {} as UserSettings), ...data } }));
  },
}));
