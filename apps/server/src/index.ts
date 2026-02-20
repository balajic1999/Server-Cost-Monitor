import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { app } from "./app";

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on :${env.PORT}`);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close();
});
