import { useEffect, useMemo, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { USE_NATIVE_DRIVER } from "./motion";
import { colors, font } from "./theme";

type Building = { w: number; h: number; tower?: boolean };

const BUILDINGS: Building[] = [
  { w: 30, h: 64 },
  { w: 38, h: 104 },
  { w: 26, h: 84 },
  { w: 12, h: 176, tower: true },
  { w: 44, h: 132 },
  { w: 30, h: 92 },
  { w: 40, h: 72 },
  { w: 28, h: 112 },
  { w: 34, h: 60 },
];

const STAGE_HEIGHT = 200;
const SUN_SIZE = 140;

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function Windows({
  building,
  seed,
  lights,
}: {
  building: Building;
  seed: number;
  lights: Animated.Value;
}) {
  const windows = useMemo(() => {
    if (building.tower) return [];
    const rand = seeded(seed);
    const cols = Math.max(1, Math.floor((building.w - 8) / 10));
    const rows = Math.floor((building.h - 12) / 16);
    const out: { col: number; row: number; at: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (rand() > 0.45) out.push({ col, row, at: rand() * 0.75 });
      }
    }
    return out;
  }, [building, seed]);

  return (
    <>
      {windows.map(({ col, row, at }) => (
        <Animated.View
          key={`${row}-${col}`}
          style={[
            styles.window,
            {
              left: 6 + col * 10,
              top: 8 + row * 16,
              opacity: lights.interpolate({
                inputRange: [at, at + 0.2],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      ))}
    </>
  );
}

export function Intro({ onDone }: { onDone: () => void }) {
  const sun = useRef(new Animated.Value(0)).current;
  const rises = useRef(BUILDINGS.map(() => new Animated.Value(0))).current;
  const lights = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const leaving = useRef(false);

  function leave() {
    if (leaving.current) return;
    leaving.current = true;
    running.current?.stop();
    Animated.timing(exit, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(onDone);
  }

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) return onDone();

      const ease = Easing.out(Easing.cubic);
      running.current = Animated.sequence([
        Animated.parallel([
          Animated.timing(sun, {
            toValue: 1,
            duration: 900,
            easing: ease,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.stagger(
            70,
            rises.map((v) =>
              Animated.timing(v, {
                toValue: 1,
                duration: 520,
                easing: ease,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ),
          ),
        ]),
        Animated.timing(lights, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(title, {
          toValue: 1,
          duration: 600,
          easing: ease,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(500),
      ]);
      running.current.start(({ finished }) => finished && leave());
    });
    return () => {
      cancelled = true;
      running.current?.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            {
              translateY: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -24],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel="Skip intro"
        style={StyleSheet.absoluteFill}
        onPress={leave}
      />
      <View pointerEvents="none" style={styles.center}>
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.sun,
              {
                opacity: sun,
                transform: [
                  {
                    translateY: sun.interpolate({
                      inputRange: [0, 1],
                      outputRange: [STAGE_HEIGHT, 0],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.skyline}>
            {BUILDINGS.map((b, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.building,
                  {
                    width: b.w,
                    height: b.h,
                    transform: [
                      {
                        translateY: rises[i]!.interpolate({
                          inputRange: [0, 1],
                          outputRange: [b.h, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {b.tower && <View style={styles.antenna} />}
                {b.tower && <View style={styles.orb} />}
                <Windows building={b} seed={i + 7} lights={lights} />
              </Animated.View>
            ))}
          </View>
        </View>
        <View style={styles.ground} />

        <Animated.View
          style={{
            alignItems: "center",
            opacity: title,
            transform: [
              {
                translateY: title.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <Text style={styles.wordmark}>ŌTA TOKYO</Text>
          <Text style={styles.tagline}>東京 · LIVE TICKETS</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.bg, zIndex: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28 },
  stage: {
    width: 314,
    height: STAGE_HEIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sun: {
    position: "absolute",
    bottom: 36,
    width: SUN_SIZE,
    height: SUN_SIZE,
    borderRadius: SUN_SIZE / 2,
    backgroundColor: colors.accent,
  },
  skyline: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  building: { backgroundColor: colors.ink },
  window: {
    position: "absolute",
    width: 4,
    height: 6,
    backgroundColor: colors.bg,
  },
  antenna: {
    position: "absolute",
    top: -26,
    left: 5,
    width: 2,
    height: 26,
    backgroundColor: colors.ink,
  },
  orb: {
    position: "absolute",
    top: 40,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  ground: {
    width: 314,
    height: 4,
    backgroundColor: colors.ink,
    marginTop: -28,
  },
  wordmark: {
    fontSize: 34,
    fontWeight: font.heavy,
    letterSpacing: 5,
    color: colors.ink,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.muted,
  },
});
