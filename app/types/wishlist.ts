// Wishlist types: DB + API Layer

export type WishlistItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  addedAt: string;
};

export type Wishlist = {
  id: string;
  name: string;
  isDefault: boolean;
  items: WishlistItem[];
};

export type AddToWishlistRequest = {
  productId: string | number;
  variantId?: string | number;
  customerId?: string | number;
  email?: string;
  shopDomain?: string;
};

export type AddToWishlistResponse = {
  success: boolean;
  wishlistItemId?: string;
  error?: string;
  example?: any;
};

export type RemoveFromWishlistRequest = {
  wishlistItemId: string;
};

export type RemoveFromWishlistResponse = {
  success: boolean;
  error?: string;
};

export type FetchWishlistResponse = {
  wishlist: WishlistItem[];
  example?: any;
};

export type MergeWishlistRequest = {
  guestItems: Array<{ productId: string | number; variantId?: string | number }>;
  customerId: string | number;
};

export type MergeWishlistResponse = {
  wishlist: WishlistItem[];
  example?: any;
  error?: string;
};
