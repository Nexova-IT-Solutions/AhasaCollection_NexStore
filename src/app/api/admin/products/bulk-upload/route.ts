import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN", "PRODUCT_MANAGER"].includes(session.user.role as string)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetRepositoryId = (formData.get("targetRepositoryId") as string | null) || undefined;
    const targetOutletId = (formData.get("targetOutletId") as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    
    // Support both XLSX and CSV files
    if (file.name.endsWith(".csv")) {
      await workbook.csv.read(buffer as any);
    } else {
      await workbook.xlsx.load(buffer);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ message: "Empty spreadsheet" }, { status: 400 });
    }

    // Pre-load categories into a lookup map
    const existingCategories = await db.category.findMany();
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

    let createdCount = 0;
    const errors: string[] = [];
    const rowsToCreate: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      const getCellVal = (colIdx: number): string => {
        const val = row.getCell(colIdx).value;
        if (val === null || val === undefined) return "";
        if (typeof val === "object" && "text" in val) return String(val.text).trim();
        if (typeof val === "object" && "result" in val) return String(val.result).trim();
        return String(val).trim();
      };

      const name = getCellVal(1);
      const sku = getCellVal(2);
      const categoryName = getCellVal(3);
      const priceStr = getCellVal(4);
      const costPriceStr = getCellVal(5);
      const stockStr = getCellVal(6);
      const weightStr = getCellVal(7);
      const shortDescription = getCellVal(8);
      const description = getCellVal(9);
      const isbn = getCellVal(10);
      const author = getCellVal(11);
      const publisher = getCellVal(12);
      const rackNumber = getCellVal(13);
      const rowNumberStr = getCellVal(14);
      const binLocation = getCellVal(15);
      const imageUrl = getCellVal(16);
      const targetRepoOrOutletName = getCellVal(17);

      if (!name) {
        errors.push(`Row ${rowNumber}: Product name is required.`);
        return;
      }

      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNumber} ("${name}"): Valid selling price is required.`);
        return;
      }

      const stock = parseInt(stockStr, 10);
      if (isNaN(stock) || stock < 0) {
        errors.push(`Row ${rowNumber} ("${name}"): Valid stock quantity is required.`);
        return;
      }

      rowsToCreate.push({
        rowNumber,
        name,
        sku: sku || `SKU-BULK-${Date.now()}-${rowNumber}`,
        categoryName: categoryName || "General",
        price,
        costPrice: costPriceStr ? parseFloat(costPriceStr) : null,
        stock,
        weightGrams: weightStr ? parseFloat(weightStr) : null,
        shortDescription: shortDescription || null,
        description: description || null,
        isbn: isbn || null,
        author: author || null,
        publisher: publisher || null,
        rackNumber: rackNumber || null,
        rowNumber: rowNumberStr || null,
        binLocation: binLocation || null,
        imageUrl: imageUrl || null,
        targetRepoOrOutletName: targetRepoOrOutletName || null,
      });
    });

    if (rowsToCreate.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { message: "No valid product rows found to import", errors },
        { status: 400 }
      );
    }

    // Pre-load all repositories & outlets for matching by name
    const allRepositories = await db.repository.findMany();
    const repoMap = new Map<string, string>();
    allRepositories.forEach((r) => repoMap.set(r.name.toLowerCase().trim(), r.id));

    const allOutlets = await db.outlet.findMany();
    const outletMap = new Map<string, string>();
    allOutlets.forEach((o) => outletMap.set(o.name.toLowerCase().trim(), o.id));

    // Fallback default repository (Warehouse One)
    let defaultRepoId: string | undefined = undefined;
    const defaultRepo = (await db.repository.findFirst({
      where: { name: { contains: "Warehouse", mode: "insensitive" } },
    })) || (await db.repository.findFirst());
    if (defaultRepo) {
      defaultRepoId = defaultRepo.id;
    }

    // Pre-load all existing product SKUs for fast upsert lookups
    const existingProductsBySku = await db.product.findMany({
      where: { sku: { not: null } },
      select: { id: true, sku: true, stock: true },
    });
    const skuToProductId = new Map<string, string>();
    existingProductsBySku.forEach((p) => {
      if (p.sku) skuToProductId.set(p.sku.toUpperCase(), p.id);
    });

    let updatedCount = 0;

    // Process rows sequentially in transaction
    await db.$transaction(async (tx) => {
      for (const item of rowsToCreate) {
        const normalizedSku = item.sku ? item.sku.toUpperCase() : null;

        // ── SKU Upsert: increment stock on existing product instead of duplicating ──
        if (normalizedSku && skuToProductId.has(normalizedSku)) {
          const existingId = skuToProductId.get(normalizedSku)!;
          await tx.product.update({
            where: { id: existingId },
            data: { stock: { increment: item.stock } },
          });
          updatedCount++;
          continue;
        }

        // Resolve or create category
        const catKey = item.categoryName.toLowerCase().trim();
        let categoryId = categoryMap.get(catKey);

        if (!categoryId) {
          const slug = catKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const newCat = await tx.category.create({
            data: {
              name: item.categoryName,
              slug: slug || `cat-${Date.now()}`,
            },
          });
          categoryId = newCat.id;
          categoryMap.set(catKey, categoryId);
        }

        // Resolve destination Repository vs Outlet for this product
        let itemRepoId: string | undefined = targetRepositoryId;
        let itemOutletId: string | undefined = targetOutletId;

        if (item.targetRepoOrOutletName) {
          const targetKey = item.targetRepoOrOutletName.toLowerCase().trim();
          if (repoMap.has(targetKey)) {
            itemRepoId = repoMap.get(targetKey);
            itemOutletId = undefined;
          } else if (outletMap.has(targetKey)) {
            itemOutletId = outletMap.get(targetKey);
            itemRepoId = undefined;
          }
        }

        // Fallback to default repository if neither repository nor outlet was specified
        if (!itemRepoId && !itemOutletId) {
          itemRepoId = defaultRepoId;
        }

        await tx.product.create({
          data: {
            name: item.name,
            sku: normalizedSku || item.sku,
            categoryId,
            price: item.price,
            costPrice: item.costPrice,
            stock: item.stock,
            repositoryId: itemRepoId,
            outletId: itemOutletId,
            weightGrams: item.weightGrams,
            shortDescription: item.shortDescription,
            description: item.description,
            isbn: item.isbn,
            author: item.author,
            publisher: item.publisher,
            rackNumber: item.rackNumber,
            rowNumber: item.rowNumber,
            binLocation: item.binLocation,
            productImages: item.imageUrl ? [{ url: item.imageUrl, isMain: true }] : [],
            productVariants: [],
            isActive: true,
          },
        });

        createdCount++;
      }
    });

    revalidatePath("/admin/products");
    revalidateTag("admin-products", "max");

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      errors,
      message: `Import complete: ${createdCount} product(s) created, ${updatedCount} product(s) had their stock updated.`,
    });
  } catch (error: any) {
    console.error("Bulk Product Upload Error:", error);
    return NextResponse.json({ message: error.message || "Failed to process bulk product upload" }, { status: 500 });
  }
}
