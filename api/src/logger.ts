import { pino } from "pino";

const pretty =
  process.stdout.isTTY &&
  process.env.NODE_ENV !== "production" &&
  process.env.NODE_ENV !== "test";

const defaultLevel = process.env.NODE_ENV === "test" ? "silent" : "info";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? defaultLevel,
  transport: pretty
    ? {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      }
    : undefined,
});
