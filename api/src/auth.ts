import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errors.ts";
import { prisma } from "./prisma.ts";

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("X-User-Id");
  if (!header || !/^\d+$/.test(header)) {
    throw new HttpError(401, "Missing or invalid X-User-Id header");
  }

  const user = await prisma.user.findUnique({ where: { id: Number(header) } });
  if (!user) throw new HttpError(401, "Unknown user");

  res.locals.user = user;
  next();
}

export async function optionalUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.header("X-User-Id") === undefined) return next();
  return requireUser(req, res, next);
}
