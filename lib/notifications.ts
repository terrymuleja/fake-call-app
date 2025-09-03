import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export async function ensureNotificationReady() {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") throw new Error("Notifications not granted");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("calls", {
      name: "Fake Calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    }),
  });
}

export async function scheduleIncomingCall(args: { seconds: number; title: string; body: string; msg: string }) {
  const { seconds, title, body, msg } = args;
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: Platform.select({ android: "default", ios: "default" }),
      data: { route: "call", caller: title, msg }
    },
    trigger: { seconds, channelId: "calls" as any }
  });
}
