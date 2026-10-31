import { randomUUID } from "node:crypto";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { pinoHttp } from "pino-http";
import { HttpError } from "./errors.ts";
import { eventsRouter } from "./events.ts";
import { logger } from "./logger.ts";
import { ticketsRouter } from "./tickets.ts";

export const app = express();

app.use(
  pinoHttp({
    logger,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      if (req.method === "GET" || req.method === "OPTIONS") return "debug";
      return "info";
    },
    customSuccessMessage: (req, res, ms) =>
      `${req.method} ${req.url} ${res.statusCode} ${Math.round(ms)}ms`,
    customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        userId: req.headers["x-user-id"],
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.json());
app.use(eventsRouter);
app.use(ticketsRouter);

app.use((_req, _res, next) => next(new HttpError(404, "Route not found")));

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.details });
  }
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: "Invalid request body" });
  }
  req.log.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal server error" });
});
