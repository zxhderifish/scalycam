import PostHog from "posthog-react-native";

let client: PostHog | null = null;

export function initAnalytics(userId?: string) {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  client = new PostHog(key, { host: "https://app.posthog.com" });
  if (userId) client.identify(userId);
}

export function track(event: string, props?: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?.capture(event, props as any);
}

// Typed event helpers
export const analytics = {
  signUp: () => track("sign_up"),
  onboardingCompleted: () => track("onboarding_completed"),
  lowCalorieWarningShown: () => track("low_calorie_warning_shown"),
  scalePaired: (chipId: string) => track("scale_paired", { chip_id: chipId }),
  pairingFailed: (reason: string) => track("pairing_failed", { reason }),
  mealRecognized: (mealId: string) => track("meal_recognized", { meal_id: mealId }),
  recognitionFailed: (mealId: string) => track("recognition_failed", { meal_id: mealId }),
  mealEdited: (mealId: string) => track("meal_edited", { meal_id: mealId }),
  foodSwapFromAlternative: (altIdx: number) => track("food_swap_from_alternative", { alternative_index: altIdx }),
  foodEntryCreated: (viaFailedMeal: boolean) => track("food_entry_created", { via_failed_meal: viaFailedMeal }),
  uploadRetry: () => track("upload_retry"),
  weightLogged: () => track("weight_logged"),
  appOpened: (coldStart: boolean) => track("app_opened", { cold_start: coldStart }),
};
