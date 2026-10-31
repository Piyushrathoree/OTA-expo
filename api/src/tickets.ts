import { Router } from "express";
import { optionalUser, requireUser } from "./auth.ts";
import { HttpError } from "./errors.ts";
import { prisma } from "./prisma.ts";

export const ticketsRouter = Router();

ticketsRouter.get("/me/tickets", requireUser, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: res.locals.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      checkedInAt: true,
      event: {
        select: { id: true, name: true, venue: true, date: true, price: true },
      },
    },
  });
  res.json(tickets);
});

ticketsRouter.post("/checkins", optionalUser, async (req, res) => {
  const code = req.body?.code;
  if (typeof code !== "string" || code.length === 0 || code.length > 64) {
    throw new HttpError(400, "code must be a non-empty string");
  }

  const scannerId: number | undefined = res.locals.user?.id;

  const checkedIn = await prisma.ticket.updateMany({
    where: {
      code,
      checkedInAt: null,
      ...(scannerId !== undefined && { userId: { not: scannerId } }),
    },
    data: { checkedInAt: new Date() },
  });

  const ticket = await prisma.ticket.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      checkedInAt: true,
      userId: true,
      event: { select: { id: true, name: true, venue: true, date: true } },
    },
  });
  if (!ticket) throw new HttpError(404, "Ticket not found");

  const { userId: ownerId, ...publicTicket } = ticket;
  if (scannerId !== undefined && scannerId === ownerId) {
    req.log.warn({ ticketId: ticket.id, userId: scannerId }, "own-ticket check-in rejected");
    throw new HttpError(403, "You can't check in your own ticket");
  }

  if (checkedIn.count === 0) {
    req.log.warn(
      { ticketId: ticket.id, firstCheckedInAt: ticket.checkedInAt },
      "duplicate check-in rejected",
    );
    throw new HttpError(409, "Ticket already checked in", {
      checkedInAt: ticket.checkedInAt,
    });
  }
  req.log.info({ ticketId: ticket.id, eventId: ticket.event.id }, "ticket checked in");
  res.json(publicTicket);
});
