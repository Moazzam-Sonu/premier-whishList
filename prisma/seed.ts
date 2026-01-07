import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create a shop
  const shop = await prisma.shop.upsert({
    where: { shopDomain: "example-shop.myshopify.com" },
    update: {},
    create: {
      shopDomain: "example-shop.myshopify.com",
      accessToken: "shpat_example_access_token_12345",
      installedAt: new Date(),
    },
  });

  console.log("✅ Created shop:", shop.shopDomain);

  // Create a default wishlist for the shop (guest wishlist)
  const defaultWishlist = await prisma.wishlist.create({
    data: {
      shopId: shop.id,
      name: "My Wishlist",
      isDefault: true,
      shareToken: randomUUID(),
    },
  });

  console.log("✅ Created default wishlist:", defaultWishlist.name);

  // Optional: Create a customer and their wishlist
  const customer = await prisma.customer.create({
    data: {
      shopId: shop.id,
      shopifyCustomerId: "gid://shopify/Customer/123456789",
      email: "customer@example.com",
    },
  });

  console.log("✅ Created customer:", customer.email);

  const customerWishlist = await prisma.wishlist.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      name: "My Favorites",
      isDefault: true,
      shareToken: randomUUID(),
    },
  });

  console.log("✅ Created customer wishlist:", customerWishlist.name);

  // Add some sample wishlist items
  const wishlistItem1 = await prisma.wishlistItem.create({
    data: {
      wishlistId: defaultWishlist.id,
      productId: "gid://shopify/Product/111111111",
      variantId: "gid://shopify/ProductVariant/222222222",
    },
  });

  const wishlistItem2 = await prisma.wishlistItem.create({
    data: {
      wishlistId: customerWishlist.id,
      productId: "gid://shopify/Product/333333333",
      variantId: null, // No specific variant
    },
  });

  console.log("✅ Created wishlist items");

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

