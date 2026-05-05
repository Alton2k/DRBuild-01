import fs from "node:fs";
import { databaseFile } from "./shared.mjs";

for (const file of [databaseFile, `${databaseFile}-wal`, `${databaseFile}-shm`]) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

await import("./seed.mjs");
