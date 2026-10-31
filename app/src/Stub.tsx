import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, shadow } from "./theme";

const DOTS = 14;
const NOTCH = 18;

function Perforation() {
  return (
    <View style={styles.perforation}>
      <View style={[styles.notch, { left: -NOTCH / 2 }]} />
      {Array.from({ length: DOTS }, (_, i) => (
        <View key={i} style={styles.dot} />
      ))}
      <View style={[styles.notch, { right: -NOTCH / 2 }]} />
    </View>
  );
}

export function Stub({
  lead,
  children,
  footer,
}: {
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        {lead}
        <View style={styles.body}>{children}</View>
      </View>
      {footer && (
        <>
          <Perforation />
          <View style={styles.footer}>{footer}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.card,
  },
  top: { flexDirection: "row", alignItems: "stretch" },
  body: { flex: 1, paddingVertical: 18, paddingHorizontal: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16 },
  perforation: {
    height: NOTCH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
  },
  dot: {
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(21,21,21,0.18)",
  },
  notch: {
    position: "absolute",
    top: 0,
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
