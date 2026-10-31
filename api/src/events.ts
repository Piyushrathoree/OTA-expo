import { randomBytes } from "node:crypto";
import { Router } from "express";
import { requireUser } from "./auth.ts";
import { HttpError } from "./errors.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "./prisma.ts";

export const eventsRouter = Router();

const MAX_QUANTITY = 4;

eventsRouter.get("/events", async (_req, res) => {
  const events = await prisma.event.findMany({
    where: { date: { gt: new Date() } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      name: true,
      venue: true,
      date: true,
      price: true,
      ticketsLeft: true,
    },
  });
  res.json(events);
});

eventsRouter.post("/events/:id/book", requireUser, async (req, res) => {
  const rawId = String(req.params.id);
  if (!/^\d+$/.test(rawId)) throw new HttpError(400, "Invalid event id");
  const eventId = Number(rawId);

  const quantity = req.body?.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new HttpError(
      400,
      `quantity must be an integer from 1 to ${MAX_QUANTITY}`,
    );
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, "Event not found");
  if (event.date <= new Date()) throw new HttpError(409, "Event has already started");

  const tickets = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const taken = await tx.event.updateMany({
      where: { id: eventId, ticketsLeft: { gte: quantity } },
      data: { ticketsLeft: { decrement: quantity } },
    });
    if (taken.count === 0) {
      req.log.warn({ eventId, quantity }, "booking rejected: not enough tickets left");
      throw new HttpError(409, "Not enough tickets left");
    }

    const created = [];
    for (let i = 0; i < quantity; i++) {
      created.push(
        await tx.ticket.create({
          data: {
            code: randomBytes(16).toString("hex"),
            userId: res.locals.user.id,
            eventId,
          },
        }),
      );
    }
    return created;
  });

  req.log.info(
    { eventId, userId: res.locals.user.id, quantity, ticketIds: tickets.map((t) => t.id) },
    "tickets booked",
  );
  res.status(201).json(tickets);
});
