import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { corsResponse, handleCorsPreflight } from "../utils/cors.server";

// Handle OPTIONS preflight
export const action = async ({ request }: ActionFunctionArgs) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;
  return corsResponse({ message: "Method not allowed" }, request, {
    status: 405,
  });
};

// GET /api/wishlists/:id - return single wishlist with shop, customer, items
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  try {
    const id = params.id;
    if (!id) {
      return corsResponse(
        { error: "Missing wishlist id" },
        request,
        { status: 400 },
      );
    }

    const w = await prisma.wishlist.findUnique({
      where: { id },
      include: {
        shop: true,
        customer: true,
        items: true,
      },
    });

    if (!w) {
      return corsResponse(
        { error: "Wishlist not found" },
        request,
        { status: 404 },
      );
    }

    const data = {
      id: w.id,
      name: w.name,
      isDefault: w.isDefault,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      shop: {
        id: w.shop.id,
        shopDomain: w.shop.shopDomain,
      },
      customer: w.customer
        ? {
            id: w.customer.id,
            shopifyCustomerId: w.customer.shopifyCustomerId,
            email: w.customer.email,
          }
        : null,
      items: w.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        addedAt: item.addedAt.toISOString(),
      })),
    };

    return corsResponse({ wishlist: data }, request);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return corsResponse(
      { error: errorMessage },
      request,
      { status: 500 },
    );
  }
};


