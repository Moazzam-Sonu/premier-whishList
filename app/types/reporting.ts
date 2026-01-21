export type ReportingRow = {
  productId: string;
  title: string;
  sku: string | null;
  inventory: number | null;
  imageUrl: string | null;
  users: string[];
  count: number;
};

export type LoaderData = {
  rows: ReportingRow[];
  page: number;
  totalPages: number;
  sort: string;
  q: string;
};
