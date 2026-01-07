import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { corsResponse, handleCorsPreflight } from "../utils/cors.server";

// GET /api/wishlists - return all wishlists with shop, customer, and items
export const action = async ({ request }: LoaderFunctionArgs) => {
  // support OPTIONS preflight on this endpoint too
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;
  return corsResponse({ message: "Method not allowed" }, request, {
    status: 405,
  });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const wishlists = await prisma.wishlist.findMany({
      include: {
        shop: true,
        customer: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Shape the response to something frontend/dev friendly
    const data = wishlists.map((w) => ({
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
    }));

    return corsResponse({ wishlists: data }, request);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return corsResponse(
      { wishlists: [], error: errorMessage },
      request,
      { status: 500 },
    );
  }
};


