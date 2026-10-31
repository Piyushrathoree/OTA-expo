import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { bookTickets, getEvents } from "./api";
import { formatTime, formatYen } from "./format";
import i18n, { dateLocale } from "./i18n";
import { FadeIn, PressableScale } from "./motion";
import { Stub } from "./Stub";
import { colors, font, radius, shadow, space } from "./theme";
import { useToast } from "./Toast";
import { usePolling } from "./usePolling";
import type { EventItem } from "./types";
import { Button, Empty, ErrorView, SkeletonList } from "./ui";

const MAX_QUANTITY = 4;

function StepButton({
  glyph,
  label,
  disabled,
  onPress,
}: {
  glyph: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.88}
      hitSlop={6}
      style={[styles.stepButton, disabled && styles.stepButtonOff]}
    >
      <Text style={[styles.stepGlyph, disabled && { color: colors.muted }]}>
        {glyph}
      </Text>
    </PressableScale>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepper}>
      <StepButton
        glyph="−"
        label={t("events.fewer")}
        disabled={value <= 1}
        onPress={() => onChange(value - 1)}
      />
      <Text style={styles.stepValue}>{value}</Text>
      <StepButton
        glyph="+"
        label={t("events.more")}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}

function DateBlock({ iso }: { iso: string }) {
  useTranslation();
  const d = new Date(iso);
  const locale = dateLocale();
  return (
    <View style={styles.dateBlock}>
      <Text style={styles.dateMonth}>
        {d.toLocaleString(locale, { month: "short" }).toUpperCase()}
      </Text>
      <Text style={styles.dateDay}>{d.getDate()}</Text>
      <Text style={styles.dateWeekday}>
        {d.toLocaleString(locale, { weekday: "short" }).toUpperCase()}
      </Text>
    </View>
  );
}

function EventCard({
  event,
  onBooked,
  onStale,
}: {
  event: EventItem;
  onBooked: () => void;
  onStale: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const max = Math.min(MAX_QUANTITY, event.ticketsLeft);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const soldOut = event.ticketsLeft === 0;
  const qty = Math.min(quantity, Math.max(max, 1));
  const lowStock = !soldOut && event.ticketsLeft <= 5;
  const time = formatTime(event.date);

  async function book() {
    setBusy(true);
    try {
      await bookTickets(event.id, qty);
      toast(t("events.booked", { count: qty, name: event.name }));
      onBooked();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("errors.generic"), "error");
      onStale();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stub
      lead={<DateBlock iso={event.date} />}
      footer={
        <View style={styles.actions}>
          {!soldOut && <Stepper value={qty} max={max} onChange={setQuantity} />}
          <Button
            label={
              soldOut
                ? t("events.soldOut")
                : t("events.book", { count: qty, total: formatYen(event.price * qty) })
            }
            loading={busy}
            disabled={soldOut}
            onPress={book}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Text style={styles.title} numberOfLines={2}>
        {event.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {event.venue}
      </Text>
      <Text style={styles.meta}>{time}</Text>

      <View style={styles.row}>
        <Text style={styles.price}>
          {formatYen(event.price)}
          <Text style={styles.per}>{t("events.perTicket")}</Text>
        </Text>
        <View
          style={[
            styles.pill,
            lowStock && styles.pillLow,
            soldOut && styles.pillSoldOut,
          ]}
        >
          {lowStock && <View style={styles.liveDot} />}
          <Text
            style={[
              styles.pillText,
              lowStock && { color: colors.accent },
              soldOut && { color: colors.onAccent },
            ]}
          >
            {soldOut
              ? t("events.soldOut")
              : t("events.left", { count: event.ticketsLeft })}
          </Text>
        </View>
      </View>
    </Stub>
  );
}

export function EventsScreen({ onBooked }: { onBooked: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEvents(await getEvents());
    } catch (e) {
      const message = e instanceof Error ? e.message : i18n.t("errors.generic");
      setError(message);
      return message;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(load, 5000);

  async function refresh() {
    setRefreshing(true);
    const failed = await load();
    setRefreshing(false);
    if (failed) toast(failed, "error");
  }

  if (error && !events) return <ErrorView message={error} onRetry={load} />;
  if (!events) return <SkeletonList variant="event" />;

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => String(e.id)}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={refresh}
      ListHeaderComponent={
        <FadeIn>
          <Text style={styles.screenTitle}>{t("events.title")}</Text>
          <Text style={styles.screenSub}>{t("events.subtitle")}</Text>
        </FadeIn>
      }
      ListEmptyComponent={
        <Empty title={t("events.emptyTitle")}>{t("events.emptyBody")}</Empty>
      }
      renderItem={({ item, index }) => (
        <FadeIn index={index + 1}>
          <EventCard event={item} onBooked={onBooked} onStale={load} />
        </FadeIn>
      )}
    />
  );
}

const STEPPER_HEIGHT = 48;
const STEPPER_PAD = 4;

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  screenTitle: {
    fontSize: 28,
    fontWeight: font.heavy,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  screenSub: { marginTop: space.xs, fontSize: 15, color: colors.muted },
  dateBlock: {
    width: 72,
    backgroundColor: colors.accent,
    borderTopLeftRadius: radius.card - 1,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
  },
  dateMonth: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: font.bold,
    letterSpacing: 2.5,
  },
  dateDay: {
    color: colors.onAccent,
    fontSize: 36,
    fontWeight: font.heavy,
    lineHeight: 40,
    fontVariant: ["tabular-nums"],
  },
  dateWeekday: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: font.semi,
    letterSpacing: 2,
    opacity: 0.8,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: space.md },
  per: { fontSize: 13, fontWeight: "400", color: colors.muted },
  price: {
    fontSize: 18,
    fontWeight: font.bold,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.faint,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  pillLow: { backgroundColor: colors.accentSoft },
  pillSoldOut: { backgroundColor: colors.ink },
  pillText: { fontSize: 13, fontWeight: font.semi, color: colors.muted },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    height: STEPPER_HEIGHT,
    padding: STEPPER_PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.faint,
  },
  stepButton: {
    width: STEPPER_HEIGHT - STEPPER_PAD * 2,
    height: STEPPER_HEIGHT - STEPPER_PAD * 2,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    boxShadow: shadow.raised,
  },
  stepButtonOff: { backgroundColor: "transparent", boxShadow: "none" },
  stepGlyph: { fontSize: 20, fontWeight: font.semi, color: colors.ink },
  stepValue: {
    minWidth: 30,
    textAlign: "center",
    fontSize: 17,
    fontWeight: font.bold,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});
