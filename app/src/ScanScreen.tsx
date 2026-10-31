import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Animated, Linking, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ApiError, checkIn } from "./api";
import { formatTime } from "./format";
import { easeOut, PressableScale, USE_NATIVE_DRIVER } from "./motion";
import { colors, font, radius, shadow, space } from "./theme";
import { Button } from "./ui";

type Result =
  | { kind: "ok"; event: string }
  | { kind: "used"; at: string }
  | { kind: "unknown" }
  | { kind: "own" }
  | { kind: "error"; message: string };

const RESET_AFTER_MS = 3000;

function ResultCard({ result, onDismiss }: { result: Result; onDismiss: () => void }) {
  const { t } = useTranslation();
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rise, {
      toValue: 1,
      speed: 14,
      bounciness: 6,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [rise]);

  const ok = result.kind === "ok";
  const title =
    result.kind === "ok"
      ? t("scan.ok")
      : result.kind === "used"
        ? t("scan.used")
        : result.kind === "unknown"
          ? t("scan.unknown")
          : result.kind === "own"
            ? t("scan.own")
            : result.message;
  const detail =
    result.kind === "ok"
      ? result.event
      : result.kind === "used"
        ? t("scan.usedAt", { time: formatTime(result.at) })
        : result.kind === "own"
          ? t("scan.ownHint")
          : t("scan.next");

  return (
    <Animated.View
      style={[
        styles.resultWrap,
        {
          opacity: rise,
          transform: [
            {
              translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
            },
          ],
        },
      ]}
    >
      <PressableScale onPress={onDismiss} scaleTo={0.98} style={styles.result}>
        <View style={[styles.resultIcon, { backgroundColor: ok ? colors.success : colors.accent }]}>
          <Text style={styles.resultGlyph}>{ok ? "✓" : "✗"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultDetail} numberOfLines={2}>
            {detail}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<Result | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(dismiss, RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [result]);

  function dismiss() {
    setResult(null);
    busy.current = false;
  }

  async function onScan(code: string) {
    if (busy.current) return;
    busy.current = true;
    try {
      const ticket = await checkIn(code);
      setResult({ kind: "ok", event: ticket.event.name });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setResult({ kind: "used", at: String(e.body?.checkedInAt) });
      } else if (e instanceof ApiError && e.status === 403) {
        setResult({ kind: "own" });
      } else if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
        setResult({ kind: "unknown" });
      } else {
        setResult({
          kind: "error",
          message: e instanceof Error ? e.message : t("errors.generic"),
        });
      }
    }
  }

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.sun} />
        <Text style={styles.heading}>{t("scan.permissionTitle")}</Text>
        <Text style={styles.muted}>{t("scan.permissionBody")}</Text>
        <Button
          label={permission.canAskAgain ? t("scan.allow") : t("scan.openSettings")}
          onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={styles.cameraFrame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={result ? undefined : ({ data }) => onScan(data)}
        />
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.hint}>
            <Text style={styles.hintText}>{t("scan.hint")}</Text>
          </View>
          <View style={styles.finder} />
        </View>
        {result && <ResultCard result={result} onDismiss={dismiss} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, padding: space.lg },
  cameraFrame: {
    flex: 1,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.ink,
    boxShadow: shadow.card,
  },
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  hint: {
    position: "absolute",
    top: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(21,21,21,0.65)",
  },
  hintText: { color: colors.onAccent, fontSize: 14, fontWeight: font.semi },
  finder: {
    width: 240,
    height: 240,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  resultWrap: { position: "absolute", left: space.md, right: space.md, bottom: space.md },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.card - space.md,
    backgroundColor: colors.card,
    boxShadow: shadow.toast,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  resultGlyph: { color: colors.onAccent, fontSize: 22, fontWeight: font.heavy },
  resultTitle: { fontSize: 17, fontWeight: font.bold, color: colors.ink },
  resultDetail: { marginTop: 2, fontSize: 14, color: colors.muted },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    padding: space.xl,
  },
  sun: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, marginBottom: space.sm },
  heading: { fontSize: 18, fontWeight: font.bold, color: colors.ink },
  muted: { color: colors.muted, fontSize: 15, textAlign: "center", marginBottom: space.sm },
});
