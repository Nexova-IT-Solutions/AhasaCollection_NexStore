ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "showInChocolateSection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "showInSoftToysSection" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Product_showInChocolateSection_idx" ON "Product"("showInChocolateSection");
CREATE INDEX IF NOT EXISTS "Product_showInSoftToysSection_idx" ON "Product"("showInSoftToysSection");