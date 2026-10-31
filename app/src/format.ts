import { dateLocale } from "./i18n";

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(dateLocale(), {
    hour: "numeric",
    minute: "2-digit",
  });

export const formatYen = (amount: number) => `¥${amount.toLocaleString("en-US")}`;
