import "./src/i18n";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getCurrentUserId, setCurrentUserId } from "./src/api";
import { EventsScreen } from "./src/EventsScreen";
import { Intro } from "./src/Intro";
import { FadeIn, PressableScale, USE_NATIVE_DRIVER } from "./src/motion";
import { colors, font, radius, shadow, space } from "./src/theme";
import { ScanScreen } from "./src/ScanScreen";
import { TicketsScreen } from "./src/TicketsScreen";
import { ToastProvider, useToast } from "./src/Toast";
import { USERS } from "./src/users";

type Tab = "events" | "tickets" | "scan";

const TABS: Tab[] = ["events", "tickets", "scan"];

const TRACK_PADDING = 4;

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const thumbWidth = (trackWidth - TRACK_PADDING * 2) / TABS.length;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: TABS.indexOf(tab),
      speed: 18,
      bounciness: 4,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [tab, slide]);

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: TABS.map((_, i) => i),
                    outputRange: TABS.map((_, i) => i * thumbWidth),
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {TABS.map((key) => (
        <PressableScale
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === key }}
          onPress={() => onChange(key)}
          scaleTo={0.97}
          style={styles.tab}
        >
          <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
            {t(`tabs.${key}`)}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

function UserSwitcher({ userId, onChange }: { userId: number; onChange: (id: number) => void }) {
  const { t } = useTranslation();
  const index = Math.max(0, USERS.findIndex((u) => u.id === userId));
  const user = USERS[index]!;
  const next = USERS[(index + 1) % USERS.length]!;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t("user.switch")}: ${user.name}`}
      onPress={() => onChange(next.id)}
      hitSlop={8}
      style={styles.userPill}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.name[0]}</Text>
      </View>
      <Text style={styles.userName}>{user.name}</Text>
    </PressableScale>
  );
}

function LanguageToggle() {
  const { t, i18n } = useTranslation();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t("language.label")}
      onPress={() => i18n.changeLanguage(i18n.language === "ja" ? "en" : "ja")}
      hitSlop={8}
      style={styles.langToggle}
    >
      <Text style={styles.langText}>{t("language.switchTo")}</Text>
    </PressableScale>
  );
}

function Shell() {
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("events");
  const [userId, setUserId] = useState(getCurrentUserId());
  const [showIntro, setShowIntro] = useState(true);

  function switchUser(id: number) {
    setCurrentUserId(id);
    setUserId(id);
    const name = USERS.find((u) => u.id === id)?.name ?? "";
    toast(t("user.switched", { name }));
  }

  return (
    <>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />

        <View style={styles.header}>
          <View style={styles.sun} />
          <Text style={styles.wordmark}>ŌTA TOKYO</Text>
          <UserSwitcher userId={userId} onChange={switchUser} />
          <LanguageToggle />
        </View>

        <Tabs tab={tab} onChange={setTab} />

        <FadeIn key={`${tab}-${userId}`} style={styles.screen}>
          {tab === "events" ? (
            <EventsScreen onBooked={() => setTab("tickets")} />
          ) : tab === "tickets" ? (
            <TicketsScreen />
          ) : (
            <ScanScreen />
          )}
        </FadeIn>
      </SafeAreaView>

      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.lg + 2,
    paddingTop: space.md,
  },
  sun: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    boxShadow: "0 0 0 4px rgba(214,38,29,0.12)",
  },
  wordmark: {
    flex: 1,
    fontSize: 19,
    fontWeight: font.heavy,
    letterSpacing: 3,
    color: colors.ink,
  },
  userPill: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 3,
    paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.raised,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  avatarText: { color: colors.onAccent, fontSize: 12, fontWeight: font.heavy },
  userName: { fontSize: 13, fontWeight: font.bold, color: colors.ink },
  langToggle: {
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.raised,
  },
  langText: { fontSize: 13, fontWeight: font.bold, color: colors.ink },
  track: {
    flexDirection: "row",
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: colors.faint,
  },
  thumb: {
    position: "absolute",
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    boxShadow: shadow.raised,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 15, fontWeight: font.semi, color: colors.muted },
  tabLabelActive: { color: colors.ink, fontWeight: font.bold },
});
