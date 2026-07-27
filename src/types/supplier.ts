export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface OutOfStockProduct {
  id: string;
  name: string;
  stock: number;
  price?: number | null;
  costPrice?: number | null;
  category?: { name: string } | null;
  supplier?: { name: string } | null;
  productImages: unknown;
  updatedAt: string;
}

export interface ProductSupply {
  id: string;
  productId: string;
  supplierId: string;
  suppliedAt: string;
  costPrice?: number | null;
  notes?: string | null;
  product?: { id: string; name: string };
}

export interface SupplierDetail extends Supplier {
  products: {
    id: string;
    name: string;
    stock: number;
    costPrice?: number | null;
    lastSuppliedAt?: string | null;
    productImages: unknown;
  }[];
  supplyHistory: ProductSupply[];
  _count: { products: number };
}
