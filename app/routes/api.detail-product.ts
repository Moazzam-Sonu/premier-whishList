import type { LoaderFunctionArgs } from "react-router";
import { sessionStorage } from "../shopify.server";
import { corsResponse, handleCorsPreflight } from "../utils/cors.server";

// Detail endpoint to fetch a product via Admin GraphQL API.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");
  if (!productId) {
    return corsResponse({ error: "Missing productId" }, request, { status: 400 });
  }
  if (!shop) {
    return corsResponse({ error: "Missing shop" }, request, { status: 400 });
  }

  const offlineSessionId = `offline_${shop}`;
  const offlineSession = await sessionStorage.loadSession(offlineSessionId);
  const sessions = await sessionStorage.findSessionsByShop(shop);
  const fallbackSession =
    sessions.find((entry) => entry.id?.startsWith("offline_")) ||
    sessions[0];
  const accessToken =
    offlineSession?.accessToken || fallbackSession?.accessToken;
  if (!accessToken) {
    return corsResponse(
      { error: "Missing access token for shop" },
      request,
      { status: 401 },
    );
  }

  const gid = `gid://shopify/Product/${productId}`;
  const response = await fetch(
    `https://${shop}/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `#graphql
          query DetailProduct($id: ID!) {
            product(id: $id) {
              id
              title
              handle
              status
              totalInventory
              featuredImage { url altText }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }`,
        variables: { id: gid },
      }),
    },
  );

  const data = await response.json();
  console.log("detail-product", { productId, status: response.status, data });

  return corsResponse({ status: response.status, data }, request, {
    status: 200,
  });
};
