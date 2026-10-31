import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, FlatList, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { getMyTickets } from "./api";
import { formatDate } from "./format";
import i18n from "./i18n";
import { FadeIn, USE_NATIVE_DRIVER } from "./motion";
import { Stub } from "./Stub";
import { colors, font, radius, space } from "./theme";
import { useToast } from "./Toast";
import { usePolling } from "./usePolling";
import type { TicketItem } from "./types";
import { Empty, ErrorView, SkeletonList } from "./ui";

function Stamp() {
  const { t } = useTranslation();
  const land = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(land, {
      toValue: 1,
      speed: 12,
      bounciness: 10,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [land]);

  return (
    <Animated.View
      style={[
        styles.stamp,
        {
          opacity: land,
          transform: [
            { rotate: "-14deg" },
            {
              scale: land.interpolate({
                inputRange: [0, 1],
                outputRange: [1.6, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.stampText}>{t("tickets.stamp")}</Text>
    </Animated.View>
  );
}

function TicketCard({ ticket }: { ticket: TicketItem }) {
  const { t } = useTranslation();
  const used = ticket.checkedInAt !== null;
  return (
    <Stub
      footer={
        <View style={styles.qrArea}>
          <View style={[styles.qr, used && styles.qrUsed]}>
            <QRCode
              value={ticket.code}
              size={168}
              color={colors.ink}
              backgroundColor="#fff"
            />
          </View>
          {used && <Stamp />}
          <View style={styles.footer}>
            <Text style={styles.code}>№ {ticket.code.slice(0, 8).toUpperCase()}</Text>
            <Text style={[styles.status, used && { color: colors.muted }]}>
              {used ? t("tickets.used") : t("tickets.ready")}
            </Text>
          </View>
        </View>
      }
    >
      <Text style={styles.kicker}>{t("tickets.admit")}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {ticket.event.name}
      </Text>
      <Text style={styles.meta}>{formatDate(ticket.event.date)}</Text>
      <Text style={styles.meta}>{ticket.event.venue}</Text>
    </Stub>
  );
}

export function TicketsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTickets(await getMyTickets());
    } catch (e) {
      const message = e instanceof Error ? e.message : i18n.t("errors.generic");
      setError(message);
      return message;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(load, 3000);

  async function refresh() {
    setRefreshing(true);
    const failed = await load();
    setRefreshing(false);
    if (failed) toast(failed, "error");
  }

  if (error && !tickets) return <ErrorView message={error} onRetry={load} />;
  if (!tickets) return <SkeletonList variant="ticket" />;

  return (
    <FlatList
      data={tickets}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={refresh}
      ListHeaderComponent={
        tickets.length > 0 ? (
          <FadeIn>
            <Text style={styles.screenTitle}>{t("tickets.title")}</Text>
            <Text style={styles.screenSub}>{t("tickets.subtitle")}</Text>
          </FadeIn>
        ) : undefined
      }
      ListEmptyComponent={
        <Empty title={t("tickets.emptyTitle")}>{t("tickets.emptyBody")}</Empty>
      }
      renderItem={({ item, index }) => (
        <FadeIn index={index + 1}>
          <TicketCard ticket={item} />
        </FadeIn>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, padding: space.lg, gap: space.lg, paddingBottom: 48 },
  screenTitle: {
    fontSize: 28,
    fontWeight: font.heavy,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  screenSub: { marginTop: space.xs, fontSize: 15, color: colors.muted },
  kicker: {
    fontSize: 11,
    fontWeight: font.bold,
    letterSpacing: 2.5,
    color: colors.accent,
    marginBottom: space.sm,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: font.bold,
    letterSpacing: -0.3,
    color: colors.ink,
    marginBottom: 6,
  },
  meta: { fontSize: 14, lineHeight: 20, color: colors.muted },
  qrArea: { alignItems: "center", paddingTop: space.sm },
  footer: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  code: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  status: { fontSize: 12, fontWeight: font.bold, color: colors.success },
  qr: {
    padding: space.sm,
    backgroundColor: "#fff",
    borderRadius: radius.inner,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrUsed: { opacity: 0.2 },
  stamp: {
    position: "absolute",
    top: 8 + 92 - 18,
    borderWidth: 2.5,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: "rgba(251,248,241,0.9)",
  },
  stampText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: font.heavy,
    letterSpacing: 2,
  },
});
