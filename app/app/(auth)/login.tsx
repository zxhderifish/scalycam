import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  async function handleAuth() {
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage({ text: error.message, type: "error" });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage({ text: error.message, type: "error" });
        else setMessage({ text: "Check your email for a confirmation link.", type: "success" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-olive"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero — shrinks when keyboard is up */}
        <View className="flex-1 items-center justify-end pb-10 pt-24 px-7" style={{ minHeight: 200 }}>
          {/* Scale icon placeholder */}
          <View className="w-20 h-20 rounded-3xl bg-olive-2 items-center justify-center mb-8"
            style={{ borderWidth: 1.5, borderColor: "rgba(200,242,61,0.3)" }}>
            <Text className="text-lime text-4xl">⚖</Text>
          </View>
          <Text className="text-lime text-xs font-semibold uppercase tracking-widest mb-3">ScalyCam</Text>
          <Text className="text-white text-[34px] font-semibold text-center" style={{ letterSpacing: -1, lineHeight: 38 }}>
            Weigh it.{"\n"}We'll log it.
          </Text>
          <Text className="text-white/60 text-base text-center mt-4 leading-relaxed">
            Auto-log your meals with AI vision.
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-bg rounded-t-3xl px-6 pt-8 pb-10">
          <Text className="text-[22px] font-semibold text-ink mb-6" style={{ letterSpacing: -0.5 }}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Text>

          <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-1.5">Email</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3.5 mb-3 text-[15px] text-ink"
            placeholder="you@example.com"
            placeholderTextColor="#B6B1A5"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
          />
          <Text className="text-xs font-semibold text-ink-mute uppercase tracking-widest mb-1.5">Password</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3.5 mb-5 text-[15px] text-ink"
            placeholder="••••••••"
            placeholderTextColor="#B6B1A5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ borderWidth: 1, borderColor: "rgba(21,20,15,0.1)" }}
          />

          {message && (
            <View
              className={`rounded-xl px-4 py-3 mb-4 ${message.type === "error" ? "bg-warn-tint" : "bg-ok/10"}`}
            >
              <Text className={`text-sm font-medium ${message.type === "error" ? "text-warn" : "text-ok"}`}>
                {message.text}
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-olive rounded-full py-4 items-center mb-4"
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#C8F23D" />
              : <Text className="text-white font-semibold text-[16px]">
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }}>
            <Text className="text-center text-[14px] font-medium text-olive">
              {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
