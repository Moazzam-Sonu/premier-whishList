export type ProductSummary = {
  id: string;
  title: string;
  imageUrl: string | null;
  handle: string;
  price: number | null;
};

export type BaseRow = {
  email: string;
  totalItems: number;
  productIds: string[];
  productCounts: Record<string, number>;
};

export type MarketingRow = {
  email: string;
  totalItems: number;
  products: ProductSummary[];
  totalPrice: number | null;
};

export type LoaderData = {
  rows: MarketingRow[];
  page: number;
  totalPages: number;
  sort: "asc" | "desc";
};
