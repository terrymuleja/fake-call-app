import React, { useEffect, useState } from "react";
import { View, Image, Vibration, BackHandler } from "react-native";
import {
  Provider as PaperProvider,
  Button,
  Text,
  TextInput,
  HelperText,
  Menu,
  Divider,
} from "react-native-paper";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";

import { ensureNotificationReady, scheduleIncomingCall } from "./lib/notifications";
import { startRingtone, stopRingtone } from "./lib/ringtone";
import { CALLERS, EXCUSES } from "./lib/excuses";

type Route =
  | { name: "home" }
  | { name: "call"; caller: string; msg: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });

  useEffect(() => {
    // Ask perms + configure channel/handler
    ensureNotificationReady().catch(() => {});

    // 1) When user TAPS the notification (app bg/quit)
    const tapSub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.route === "call") {
        setRoute({
          name: "call",
          caller: String(data.caller || "Unknown"),
          msg: String(data.msg || "Incoming call…"),
        });
      }
    });

    // 2) When notification ARRIVES while app is foregrounded (auto-open)
    const recvSub = Notifications.addNotificationReceivedListener((notif) => {
      const data = notif.request.content.data as any;
      if (data?.route === "call") {
        setRoute({
          name: "call",
          caller: String(data.caller || "Unknown"),
          msg: String(data.msg || "Incoming call…"),
        });
      }
    });

    return () => {
      tapSub.remove();
      recvSub.remove();
    };
  }, []);

  return (
    <PaperProvider>
      {route.name === "home" ? (
        <HomeScreen onNavigateToCall={(caller, msg) => setRoute({ name: "call", caller, msg })} />
      ) : (
        <CallScreen caller={route.caller} msg={route.msg} onEnd={() => setRoute({ name: "home" })} />
      )}
    </PaperProvider>
  );
}

/* ===================== Home (schedule) ===================== */
function HomeScreen({ onNavigateToCall }: { onNavigateToCall: (c: string, m: string) => void }) {
  const [seconds, setSeconds] = useState("10");
  const [caller, setCaller] = useState(CALLERS[0].name);
  const [category, setCategory] = useState<keyof typeof EXCUSES>("general");
  const [status, setStatus] = useState("");
  const [callerMenuVisible, setCallerMenuVisible] = useState(false);
  const [catMenuVisible, setCatMenuVisible] = useState(false);

  const secInvalid = Number.isNaN(parseInt(seconds, 10)) || parseInt(seconds, 10) < 1;

  async function schedule() {
    const secs = Math.max(1, parseInt(seconds || "10", 10));
    const msg = EXCUSES[category][Math.floor(Math.random() * EXCUSES[category].length)];

    // Schedule LOCAL notification (for bg + tap-to-open)
    await scheduleIncomingCall({
      seconds: secs,
      title: caller,
      body: "Incoming call…",
      msg,
    });

    // Foreground fallback (auto-open even if user doesn't tap)
    setTimeout(() => {
      onNavigateToCall(caller, msg);
    }, secs * 1000);

    setStatus(`Scheduled from ${caller} in ${secs}s.\nExcuse: ${msg}`);
  }

  return (
    <View style={{ padding: 16, paddingTop: 48 }}>
      <Text variant="headlineMedium" style={{ marginBottom: 8 }}>
        Fake Call
      </Text>
      <Text variant="bodyMedium" style={{ marginBottom: 16, opacity: 0.7 }}>
        Schedule a realistic incoming call with one tap.
      </Text>

      <TextInput
        mode="outlined"
        label="Seconds until call"
        value={seconds}
        onChangeText={setSeconds}
        keyboardType="number-pad"
      />
      <HelperText type={secInvalid ? "error" : "info"} visible>
        {secInvalid ? "Enter a number ≥ 1" : "Tip: try 10 for a quick test"}
      </HelperText>

      <Menu
        visible={callerMenuVisible}
        onDismiss={() => setCallerMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setCallerMenuVisible(true)}>
            Caller: {caller}
          </Button>
        }
      >
        {CALLERS.map((c) => (
          <Menu.Item
            key={c.id}
            onPress={() => {
              setCaller(c.name);
              setCallerMenuVisible(false);
            }}
            title={c.name}
          />
        ))}
      </Menu>

      <Divider style={{ marginVertical: 8 }} />

      <Menu
        visible={catMenuVisible}
        onDismiss={() => setCatMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setCatMenuVisible(true)}>
            Excuse category: {category}
          </Button>
        }
      >
        {Object.keys(EXCUSES).map((k) => (
          <Menu.Item
            key={k}
            onPress={() => {
              setCategory(k as any);
              setCatMenuVisible(false);
            }}
            title={k}
          />
        ))}
      </Menu>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <Button mode="contained" style={{ flex: 1 }} onPress={schedule} disabled={secInvalid}>
          Schedule Call
        </Button>
        <Button mode="outlined" style={{ flex: 1 }} onPress={() => setStatus("")}>
          Clear
        </Button>
      </View>

      {status ? (
        <View style={{ marginTop: 16 }}>
          <Text>{status}</Text>
        </View>
      ) : null}

      {/* Dev shortcut to preview the call UI immediately */}
      <Button style={{ marginTop: 24 }} mode="text" onPress={() => onNavigateToCall(caller, "Incoming call…")}>
        Preview incoming call screen
      </Button>
    </View>
  );
}

/* ===================== Call screen ===================== */
function CallScreen({ caller, msg, onEnd }: { caller: string; msg: string; onEnd: () => void }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const blockBack = BackHandler.addEventListener("hardwareBackPress", () => true);
    (async () => {
      await startRingtone();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 500, 500], true); // repeat pattern
    })();
    return () => {
      blockBack.remove();
      cleanup();
    };
  }, []);

  async function cleanup() {
    await stopRingtone();
    Vibration.cancel();
  }

  async function accept() {
    setAccepted(true);
    await stopRingtone();
    Vibration.cancel();
  }

  async function decline() {
    await cleanup();
    onEnd();
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "black",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Image
        source={{ uri: "https://i.pravatar.cc/300?img=11" }}
        style={{ width: 128, height: 128, borderRadius: 64, marginBottom: 16 }}
      />
      <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>
        {caller}
      </Text>
      <Text style={{ color: "#bbb", marginBottom: 24 }}>{accepted ? "On call…" : msg}</Text>

      {!accepted ? (
        <View style={{ flexDirection: "row", gap: 20 }}>
          <Button mode="contained-tonal" onPress={decline}>
            Decline
          </Button>
          <Button mode="contained" onPress={accept}>
            Accept
          </Button>
        </View>
      ) : (
        <Button mode="contained" buttonColor="#ef4444" onPress={decline}>
          End Call
        </Button>
      )}
    </View>
  );
}
