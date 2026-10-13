import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/lib/store/auth";
import { useSettingsStore } from "@/lib/store/settings";
import { queryPersister } from "@/lib/persist/queryPersister";
import { supabase } from "@/lib/supabase";

const ONE_MINUTE = 60_000;
const ONE_HOUR   = 60 * ONE_MINUTE;
const ONE_DAY    = 24 * ONE_HOUR;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data immediately; refetch in background after 2 min
      staleTime: 2 * ONE_MINUTE,
      // Keep unused data in memory for 1 hour
      gcTime: ONE_HOUR,
      retry: 2,
    },
  },
});

function AuthGate() {
  const { session, loading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Auto-sync device timezone to user_settings whenever a session is active.
  useEffect(() => {
    if (!session) return;
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!deviceTz) return;
    // Fire-and-forget — only updates if timezone changed
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      supabase
        .from("user_settings")
        .upsert({ user_id: userId, timezone: deviceTz, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .then(() => {});
    });
  }, [session]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) {
      router.replace("/(auth)/login");
    } else if (session && inAuth) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={
          queryPersister
            ? {
                persister: queryPersister,
                // Cached data older than 24h is discarded on next open
                maxAge: ONE_DAY,
                // Don't restore cache if there's been a breaking query key change
                buster: "v1",
              }
            : { persister: { persistClient: async () => {}, restoreClient: async () => undefined, removeClient: async () => {} }, maxAge: 0 }
        }
      >
        <AuthGate />
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
