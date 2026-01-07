import prisma from "../db.server";

/**
 * Ensure there is at least one Shop in the DB and return it.
 * For now we use a single default shop for all wishlist data.
 */
export async function getOrCreateDefaultShop() {
  let shop = await prisma.shop.findFirst();
  if (shop) return shop;

  shop = await prisma.shop.create({
    data: {
      shopDomain: "dev-shop.myshopify.com",
      accessToken: "dev-access-token",
    },
  });

  return shop;
}

/**
 * Treat the incoming customerId from the storefront as Shopify's customer ID
 * and map it to our internal Customer row.
 */
export async function getOrCreateCustomerForShopifyId(shopifyCustomerId: string) {
  const shop = await getOrCreateDefaultShop();

  const customer = await prisma.customer.upsert({
    where: {
      shopId_shopifyCustomerId: {
        shopId: shop.id,
        shopifyCustomerId,
      },
    },
    create: {
      shopId: shop.id,
      shopifyCustomerId,
    },
    update: {},
  });

  return { shop, customer };
}


