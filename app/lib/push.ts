import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermission(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  const platform = Platform.OS === "ios" ? "ios" : "android";
  await api.registerPushToken(token, platform);
  return token;
}

export function setupNotificationResponseHandler(
  onSwapAlternative: (entryId: string, altIdx: number) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as { entry_id?: string; alternative_index?: number } | undefined;
    if (actionIdentifier.startsWith("swap_") && data?.entry_id !== undefined) {
      const altIdx = parseInt(actionIdentifier.replace("swap_", ""), 10);
      onSwapAlternative(data.entry_id, altIdx);
    }
  });
}
