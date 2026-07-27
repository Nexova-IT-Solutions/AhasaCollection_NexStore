import { db } from "./src/lib/db";

async function checkCategories() {
  const categories = await db.category.findMany({
    select: { name: true, slug: true }
  });
  console.log(JSON.stringify(categories, null, 2));
}

checkCategories();
