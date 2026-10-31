import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  if (process.argv.includes("--if-empty") && (await prisma.user.count()) > 0) {
    console.log("Database already has data, skipping seed");
    return;
  }

  await prisma.ticket.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: 1, name: "Aiko" },
      { id: 2, name: "Kenji" },
      { id: 3, name: "Yuki" },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        id: 1,
        name: "Ōta TOKYO Night: Last Seats",
        venue: "Shibuya Hall",
        date: daysFromNow(7),
        price: 4500,
        totalTickets: 2,
        ticketsLeft: 2,
      },
      {
        id: 2,
        name: "Ōta TOKYO Live Vol.1",
        venue: "Zepp Haneda",
        date: daysFromNow(14),
        price: 6000,
        totalTickets: 100,
        ticketsLeft: 100,
      },
      {
        id: 3,
        name: "Ōta TOKYO Summer Fest",
        venue: "Yoyogi Park Stage",
        date: daysFromNow(30),
        price: 8000,
        totalTickets: 500,
        ticketsLeft: 500,
      },
    ],
  });
}

main()
  .then(() => console.log("Seeded"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
