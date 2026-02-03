import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { sendKlaviyoEvent } from "../utils/klaviyo.server";

type SendRequest = {
  email?: string;
  totalItems?: number;
  totalPrice?: number | null;
  products?: Array<{
    id: string;
    title: string;
    imageUrl?: string | null;
    handle?: string;
    price?: number | null;
  }>;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return new Response(JSON.stringify({ message: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const body = (await request.json()) as SendRequest;
  const email = (body.email || "").trim();

  if (!email) {
    return new Response(JSON.stringify({ success: false, error: "Missing email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });
  if (!shop?.klaviyoPrivateKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Klaviyo API key not set. Add it in Settings.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const products = Array.isArray(body.products) ? body.products : [];
  const shopDomain = session.shop;
  const storeUrl = `https://${shopDomain}`;

  let storeName = shopDomain;
  try {
    const response = await admin.graphql(
      `#graphql
        query GetShopName {
          shop {
            name
          }
        }`,
    );
    const data = await response.json();
    storeName = data?.data?.shop?.name || shopDomain;
  } catch {
    storeName = shopDomain;
  }
  const properties = {
    shopDomain,
    storeName,
    storeUrl,
    wishlistUrl: `${storeUrl}/pages/premier-wishlist`,
    totalItems: body.totalItems || 0,
    totalPrice: body.totalPrice || 0,
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      url: product.handle ? `${storeUrl}/products/${product.handle}` : null,
      imageUrl: product.imageUrl || null,
      price: product.price ?? null,
    })),
  };

  try {
    await sendKlaviyoEvent({
      apiKey: shop.klaviyoPrivateKey,
      eventName: "Wishlist Marketing Email",
      email,
      properties,
      value: typeof body.totalPrice === "number" ? body.totalPrice : undefined,
    });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
