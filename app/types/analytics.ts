export type ShopperRow = {
  email: string;
  count: number;
};

export type ProductRow = {
  productId: string;
  title: string;
  handle: string;
  imageUrl: string | null;
  shoppers: number;
  stock: number | null;
};

export type LoaderData = {
  shoppers: ShopperRow[];
  popular: ProductRow[];
  runningOut: ProductRow[];
  range: string;
  from?: string;
  to?: string;
};

export type DateRangeFilterProps = {
  selectedRange: string;
  rangeValue: string;
  fromValue: string;
  onRangeChange: (value: string) => void;
  onCustomRangeChange: (value: string) => void;
};
