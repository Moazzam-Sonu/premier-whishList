import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import type {
  AddToWishlistRequest,
  WishlistItem,
} from "../types/wishlist";
import { corsResponse, handleCorsPreflight } from "../utils/cors.server";
import {
  getOrCreateCustomerForShopifyId,
  getOrCreateDefaultShop,
} from "../utils/wishlist.server";

// Handle OPTIONS preflight requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;
  return corsResponse({ message: "Method not allowed" }, request, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = (await request.json()) as AddToWishlistRequest;
    const { customerId: shopifyCustomerId, productId, variantId, email } = body;
    if (!productId) {
      return corsResponse(
        { success: false, error: "Missing productId" },
        request,
        { status: 400 },
      );
    }
    const normalizedProductId = String(productId);
    const normalizedVariantId =
      variantId === undefined || variantId === null
        ? null
        : String(variantId);
    if (!normalizedVariantId) {
      return corsResponse(
        { success: false, error: "Missing variantId" },
        request,
        { status: 400 },
      );
    }

    let wishlist;
    if (shopifyCustomerId) {
      // Map Shopify customer ID to our internal Customer + Shop
      const { shop, customer } =
        await getOrCreateCustomerForShopifyId(shopifyCustomerId, email);

      // Find customer's default wishlist or create it
      wishlist = await prisma.wishlist.findFirst({
        where: {
          customerId: customer.id,
          isDefault: true,
        },
        include: { items: true },
      });

      if (!wishlist) {
        wishlist = await prisma.wishlist.create({
          data: {
            name: "Default Wishlist",
            customerId: customer.id,
            isDefault: true,
            shopId: shop.id,
            shareToken: crypto.randomUUID(),
          },
          include: { items: true },
        });
      }
    } else {
      // Guest wishlist: associate with default shop but no customer
      const shop = await getOrCreateDefaultShop();
      wishlist = await prisma.wishlist.create({
        data: {
          name: "Guest Wishlist",
          isDefault: true,
          shopId: shop.id,
          shareToken: crypto.randomUUID(),
        },
        include: { items: true },
      });
    }

    // Prevent duplicates per wishlist
    const existing = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: normalizedProductId,
        variantId: normalizedVariantId,
      },
    });
    if (existing) {
      return corsResponse({
        success: true,
        wishlistItemId: existing.id,
        example: { id: existing.id },
      }, request);
    }

    const newItem = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: normalizedProductId,
        variantId: normalizedVariantId,
      },
    });

    // Example data for dev/front
    const example: WishlistItem = {
      id: newItem.id,
      productId: normalizedProductId,
      variantId: newItem.variantId || undefined,
      addedAt: newItem.addedAt.toISOString(),
    };

    return corsResponse({
      success: true,
      wishlistItemId: newItem.id,
      example,
    }, request);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return corsResponse(
      { success: false, error: errorMessage },
      request,
      { status: 500 },
    );
  }
};
