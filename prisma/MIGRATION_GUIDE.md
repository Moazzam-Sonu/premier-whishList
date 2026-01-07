# Database Migration Guide

This guide will help you set up the Wishlist app database schema.

## Prerequisites

1. Install dependencies (if not already installed):
```bash
npm install
```

2. Install tsx (for running TypeScript seed files):
```bash
npm install --save-dev tsx
```

## Migration Steps

### Step 1: Generate Prisma Client

First, generate the Prisma Client based on the updated schema:

```bash
npx prisma generate
```

### Step 2: Create Migration

Create a new migration for the Wishlist models:

```bash
npx prisma migrate dev --name add_wishlist_models
```

This command will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Regenerate the Prisma Client

### Step 3: Run Seed Script (Optional)

To populate the database with sample data:

```bash
npm run db:seed
```

Or using Prisma directly:

```bash
npx prisma db seed
```

## Database Schema Overview

### Models Created

1. **Shop** - Stores shop information
   - `id` (UUID, primary key)
   - `shopDomain` (unique)
   - `accessToken`
   - `installedAt`, `createdAt`, `updatedAt`

2. **Customer** - Stores customer information
   - `id` (UUID, primary key)
   - `shopId` (foreign key to Shop)
   - `shopifyCustomerId` (Shopify customer ID)
   - `email` (nullable)
   - `createdAt`, `updatedAt`

3. **Wishlist** - Stores wishlist information
   - `id` (UUID, primary key)
   - `shopId` (foreign key to Shop)
   - `customerId` (nullable, foreign key to Customer)
   - `name` (wishlist name)
   - `isDefault` (boolean)
   - `shareToken` (unique, for sharing)
   - `createdAt`, `updatedAt`

4. **WishlistItem** - Stores items in wishlists
   - `id` (UUID, primary key)
   - `wishlistId` (foreign key to Wishlist)
   - `productId` (Shopify product ID)
   - `variantId` (nullable, Shopify variant ID)
   - `addedAt` (timestamp)

### Relations

- Shop → Customer (one-to-many)
- Shop → Wishlist (one-to-many)
- Customer → Wishlist (one-to-many)
- Wishlist → WishlistItem (one-to-many)

### Indexes

Indexes are automatically created on:
- `Shop.shopDomain`
- `Customer.shopId`, `shopifyCustomerId`, `email`
- `Wishlist.shopId`, `customerId`, `shareToken`
- `WishlistItem.wishlistId`, `productId`, `variantId`

## Troubleshooting

### Migration Fails

If migration fails, you can reset the database (⚠️ **WARNING**: This will delete all data):

```bash
npx prisma migrate reset
```

Then run the migration again:

```bash
npx prisma migrate dev --name add_wishlist_models
```

### View Database

To view your database in Prisma Studio:

```bash
npx prisma studio
```

This will open a web interface at `http://localhost:5555` where you can view and edit your data.

## Production Deployment

For production deployments, use:

```bash
npx prisma migrate deploy
```

This applies pending migrations without prompting for a migration name.

