import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { PressableScale, usePulse } from "./motion";
import { Stub } from "./Stub";
import { colors, font, radius, shadow, space } from "./theme";

type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  loading,
  variant = "primary",
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const primary = variant === "primary";
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      style={[
        styles.button,
        primary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onAccent : colors.ink} />
      ) : (
        <Text
          style={[
            styles.label,
            !primary && { color: colors.ink },
            disabled && { color: colors.muted },
          ]}
        >
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <View style={styles.sun} />
      <Text style={styles.heading}>{t("errors.title")}</Text>
      <Text style={styles.muted}>{message}</Text>
      <Button label={t("errors.retry")} variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.center}>
      <View style={styles.sun} />
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.muted}>{children}</Text>
    </View>
  );
}

function Bar({ width, height = 12 }: { width: DimensionValue; height?: number }) {
  return <View style={[styles.bar, { width, height }]} />;
}

export function SkeletonList({ variant }: { variant: "event" | "ticket" }) {
  const opacity = usePulse();
  const isEvent = variant === "event";
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{ opacity }}>
          <Stub
            lead={isEvent ? <View style={styles.skeletonDate} /> : undefined}
            footer={
              isEvent ? (
                <View style={styles.skeletonRow}>
                  <Bar width={118} height={48} />
                  <View style={{ flex: 1 }}>
                    <Bar width="100%" height={48} />
                  </View>
                </View>
              ) : (
                <View style={styles.skeletonQrWrap}>
                  <View style={styles.skeletonQr} />
                </View>
              )
            }
          >
            <View style={styles.skeletonBody}>
              <Bar width="75%" height={18} />
              <Bar width="50%" />
              <Bar width="35%" />
            </View>
          </Stub>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.accent, boxShadow: shadow.accent },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.raised,
  },
  disabled: { backgroundColor: colors.faint, borderWidth: 0, boxShadow: "none" },
  label: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: font.bold,
    letterSpacing: 0.2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    padding: space.xl,
  },
  sun: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    marginBottom: space.sm,
  },
  heading: { fontSize: 18, fontWeight: font.bold, color: colors.ink },
  muted: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    marginBottom: space.sm,
  },
  skeletonList: { padding: space.lg, gap: space.lg },
  skeletonBody: { gap: space.sm },
  skeletonRow: { flexDirection: "row", gap: space.md },
  skeletonDate: {
    width: 72,
    backgroundColor: colors.faint,
    borderTopLeftRadius: radius.card - 1,
  },
  skeletonQrWrap: { alignItems: "center", paddingVertical: space.sm },
  skeletonQr: {
    width: 184,
    height: 184,
    borderRadius: radius.inner,
    backgroundColor: colors.faint,
  },
  bar: { borderRadius: radius.pill, backgroundColor: colors.faint },
});
