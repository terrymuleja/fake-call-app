import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

let sound: Audio.Sound | null = null;

export async function startRingtone() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix
  });
  sound = new Audio.Sound();
  await sound.loadAsync(require("../assets/ringtone.mp3"), { isLooping: true });
  await sound.playAsync();
}

export async function stopRingtone() {
  try { await sound?.stopAsync(); await sound?.unloadAsync(); } catch {}
  sound = null;
}
