import { db } from "../src/lib/db";

async function test() {
  try {
    const start = Date.now();
    const count = await db.occasion.count();
    console.log(`Success! Occasion count: ${count} (took ${Date.now() - start}ms)`);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    process.exit(0);
  }
}

test();
