import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { app } from "../src/app.ts";
import { prisma } from "../src/prisma.ts";

let server: Server;
let baseUrl: string;
const createdEventIds: number[] = [];

function post(path: string, body: unknown, userId: string | null = "1") {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId && { "X-User-Id": userId }),
    },
    body: JSON.stringify(body),
  });
}

async function createEvent(seats: number) {
  const event = await prisma.event.create({
    data: {
      name: "Test event",
      venue: "Test Hall",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      price: 1000,
      totalTickets: seats,
      ticketsLeft: seats,
    },
  });
  createdEventIds.push(event.id);
  return event.id;
}

const book = (eventId: number, quantity: unknown) =>
  post(`/events/${eventId}/book`, { quantity });

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Aiko" },
  });
  await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Kenji" },
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { eventId: { in: createdEventIds } } });
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

describe("rule 1: no overselling", () => {
  it("10 people racing for the last 2 seats: exactly 2 get one", async () => {
    const eventId = await createEvent(2);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => book(eventId, 1)),
    );
    const statuses = responses.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(2);
    expect(statuses.filter((s) => s === 409)).toHaveLength(8);

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.ticketsLeft).toBe(0);
    expect(await prisma.ticket.count({ where: { eventId } })).toBe(2);
  });

  it("two people booking 2 each for 2 seats: one gets both, the other none", async () => {
    const eventId = await createEvent(2);

    const responses = await Promise.all([book(eventId, 2), book(eventId, 2)]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.ticket.count({ where: { eventId } })).toBe(2);
  });

  it("rejects quantities outside 1 to 4 without touching the seats", async () => {
    const eventId = await createEvent(10);

    for (const quantity of [0, 5, -1, 1.5, "2", null]) {
      expect((await book(eventId, quantity)).status).toBe(400);
    }

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    expect(event.ticketsLeft).toBe(10);
  });
});

describe("rule 2: a ticket checks in only once", () => {
  it("5 simultaneous scans: one succeeds, the rest get 409 with the first time", async () => {
    const eventId = await createEvent(1);
    const [ticket] = (await (await book(eventId, 1)).json()) as { code: string }[];

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => post("/checkins", { code: ticket!.code }, null)),
    );
    const bodies = (await Promise.all(responses.map((r) => r.json()))) as {
      checkedInAt: string;
    }[];
    const ok = responses.filter((r) => r.status === 200);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(4);

    const firstCheckIn = bodies[responses.findIndex((r) => r.status === 200)]!.checkedInAt;
    for (const [i, res] of responses.entries()) {
      if (res.status === 409) expect(bodies[i]!.checkedInAt).toBe(firstCheckIn);
    }
  });

  it("unknown code returns 404", async () => {
    expect((await post("/checkins", { code: "does-not-exist" }, null)).status).toBe(404);
  });
});

describe("rule 3: you can't check in your own ticket", () => {
  it("owner gets 403 and the ticket stays unused; someone else can check it in", async () => {
    const eventId = await createEvent(1);
    const [ticket] = (await (await book(eventId, 1)).json()) as { code: string }[];

    const own = await post("/checkins", { code: ticket!.code }, "1");
    expect(own.status).toBe(403);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { code: ticket!.code } })).checkedInAt).toBeNull();

    expect((await post("/checkins", { code: ticket!.code }, "2")).status).toBe(200);
    expect((await post("/checkins", { code: ticket!.code }, "1")).status).toBe(403);
  });

  it("an invalid X-User-Id is rejected, but no header at all still works", async () => {
    const eventId = await createEvent(1);
    const [ticket] = (await (await book(eventId, 1)).json()) as { code: string }[];

    expect((await post("/checkins", { code: ticket!.code }, "999")).status).toBe(401);
    expect((await post("/checkins", { code: ticket!.code }, null)).status).toBe(200);
  });
});
