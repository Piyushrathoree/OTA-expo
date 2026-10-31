# Ōta TOKYO: mini ticketing

Book a ticket, show it as a QR code, check it in at the gate.

- `api/`: Express 5, Prisma 7, MySQL 8.4, TypeScript
- `app/`: Expo (React Native), English and Japanese

## Two rules

1. **No overselling.** Booking runs one conditional `UPDATE`, so the database decides who gets the last seat:
   ```sql
    UPDATE Event SET ticketsLeft = ticketsLeft - :qty WHERE id = :id AND ticketsLeft >= :qty
   ```

    Zero rows changed means sold out (`409`). See `api/src/events.ts`.
2. **One check-in per ticket.** Same idea: `UPDATE Ticket ... WHERE code = :code AND checkedInAt IS NULL`. Later scans get `409` with the first check-in time. See `api/src/tickets.ts`.

`api/test/rules.test.ts` proves both with concurrent requests against a real database.

## Setup

Needs **Bun**, **Node 24** and **Docker** (for MySQL only).

```bash
# 1. Database
docker compose up -d --wait

# 2. API (new terminal)
cd api
cp .env.example .env
bun install
bun run setup        # creates tables, seeds 3 users and 3 events
bun dev              # http://localhost:3000

# 3. App (new terminal)
cd app
cp .env.example .env
bun install
bunx expo start      # scan the QR code
```

- **Port 3306 taken?** Use `MYSQL_PORT=3307 docker compose up -d --wait` and set the same port in `api/.env`.
- **iPhone:** scan with the Camera app, then tap the banner. Expo Go has no scanner.
- **Expo Go says "not signed into Expo CLI":** run `bunx expo login`.
- **Same Wi-Fi:** the phone must be on the same network as the computer.
- **Tests:** `bun run test`. Re-running `bun run setup` resets the data.

## API

Users are identified by an `X-User-Id` header (seeded users: 1, 2, 3). There is no login.

| Method | Path | Description |
|---|---|---|
| GET | `/events` | Upcoming events with tickets left |
| POST | `/events/:id/book` | Body `{"quantity": 1-4}`. Needs `X-User-Id` |
| GET | `/me/tickets` | Your tickets. Needs `X-User-Id` |
| POST | `/checkins` | Body `{"code": "..."}`. `X-User-Id` is optional; the owner gets `403` |

Status codes: `201` created, `400` bad input, `401` unknown user, `403` own ticket, `404` not found, `409` sold out or already checked in.

```bash
curl localhost:3000/events

curl -X POST localhost:3000/events/1/book \
  -H "X-User-Id: 1" -H "Content-Type: application/json" \
  -d '{"quantity": 2}'                      # 201

curl -X POST localhost:3000/checkins \
  -H "Content-Type: application/json" \
  -d '{"code": "PASTE_CODE_HERE"}'          # 200, then 409 on the second run
```

Get a code from `curl localhost:3000/me/tickets -H "X-User-Id: 1"`.

## Decisions

- `X-User-Id` **is not real login.** 
- **Live updates use polling** (My tickets every 3 s, Events every 5 s). in the case of scale  we should websocket because polling can make our cpu crash .
- **Logging:** pino, one line per request with an `X-Request-Id`.
- `allowPublicKeyRetrieval=true` in `DATABASE_URL` lets the driver fetch MySQL's key after a restart. Fine on `127.0.0.1`; use TLS over a real network.
- **Responses are** `Cache-Control: no-store`, so phones never show stale seat or check-in data.
# OTA-expo
