import { app } from "./app.ts";
import { logger } from "./logger.ts";
import { prisma } from "./prisma.ts";

const port = Number(process.env.PORT ?? 3000);

try {
  await prisma.$queryRaw`SELECT 1`;
} catch (err) {
  logger.fatal(
    { err },
    "Can't reach MySQL. Is it running (docker compose up -d --wait) and does DATABASE_URL in api/.env match it?",
  );
  process.exit(1);
}

app.listen(port, () => logger.info({ port }, "API listening"));
