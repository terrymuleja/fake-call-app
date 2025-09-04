import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function initNotifications() {
  if (Platform.OS === 'android') {
    const channelId = 'calls';

    // If a channel with the same id exists, delete it first;
    // channel properties are immutable on Android 8+.
    const existing = await Notifications.getNotificationChannelAsync(channelId);
    if (existing) {
      await Notifications.deleteNotificationChannelAsync(channelId);
    }

    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Fake Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default', // or 'fake_call' if you bundle res/raw/fake_call.(mp3|wav)
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // required on the new API (iOS foreground presentation)
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
