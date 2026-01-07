import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import type { RemoveFromWishlistRequest } from "../types/wishlist";
import { corsResponse, handleCorsPreflight } from "../utils/cors.server";

// Handle OPTIONS preflight requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;
  return corsResponse({ message: "Method not allowed" }, request, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = (await request.json()) as RemoveFromWishlistRequest;
    const { wishlistItemId } = body;
    if (!wishlistItemId) {
      return corsResponse(
        { success: false, error: "Missing wishlistItemId" },
        request,
        { status: 400 },
      );
    }

    await prisma.wishlistItem.delete({ where: { id: wishlistItemId } });
    return corsResponse({ success: true }, request);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return corsResponse(
      { success: false, error: errorMessage },
      request,
      { status: 500 },
    );
  }
};

