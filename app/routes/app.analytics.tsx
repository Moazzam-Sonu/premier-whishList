import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import "../styles/analytics.css";
import DateRangeFilter from "../components/analytics/DateRangeFilter";
import ShopperList from "../components/analytics/ShopperList";
import ProductList from "../components/analytics/ProductList";
import type { LoaderData, ProductRow } from "../types/analytics";

const STOCK_THRESHOLD = 5;

const chunk = <T,>(list: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "last_7";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const now = new Date();
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (range === "today") {
    fromDate = new Date(now);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === "yesterday") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 1);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(fromDate);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === "last_7") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 6);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === "last_30") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 29);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === "last_90") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 89);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);
  } else if (range === "custom" && fromParam && toParam) {
    fromDate = new Date(fromParam);
    toDate = new Date(toParam);
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
  });
  const resolvedShop = shop || (await prisma.shop.findFirst());
  if (!resolvedShop) {
    return { shoppers: [], popular: [], runningOut: [] };
  }

  const items = await prisma.wishlistItem.findMany({
    where: {
      wishlist: { shopId: resolvedShop.id },
      ...(fromDate && toDate
        ? { addedAt: { gte: fromDate, lte: toDate } }
        : {}),
    },
    include: {
      wishlist: {
        select: {
          customerId: true,
          customer: { select: { email: true } },
        },
      },
    },
  });

  const shopperMap = new Map<string, number>();
  const productMap = new Map<
    string,
    { count: number; customerIds: Set<string | null> }
  >();

  items.forEach((item) => {
    const email = item.wishlist.customer?.email;
    if (email) {
      shopperMap.set(email, (shopperMap.get(email) || 0) + 1);
    }
    const entry = productMap.get(item.productId) || {
      count: 0,
      customerIds: new Set(),
    };
    entry.count += 1;
    entry.customerIds.add(item.wishlist.customerId || null);
    productMap.set(item.productId, entry);
  });

  const shoppers = Array.from(shopperMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([email, count]) => ({ email, count }));

  const productIds = Array.from(productMap.keys());
  const productData = new Map<string, ProductRow>();

  for (const ids of chunk(productIds, 50)) {
    const gids = ids.map((id) => `gid://shopify/Product/${id}`);
    const response = await admin.graphql(
      `#graphql
        query AnalyticsProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              handle
              featuredImage { url }
              totalInventory
            }
          }
        }`,
      { variables: { ids: gids } },
    );
    const data = await response.json();
    const nodes = data?.data?.nodes || [];
    type ProductNode = {
      id: string;
      title: string;
      handle: string;
      featuredImage?: { url: string } | null;
      totalInventory?: number | null;
    };
    (nodes as Array<ProductNode | null>).forEach((node) => {
      if (!node) return;
      const id = String(node.id || "");
      const numericId = id.split("/").pop() || "";
      const productStats = productMap.get(numericId);
      if (!productStats) return;
      productData.set(numericId, {
        productId: numericId,
        title: node.title,
        handle: node.handle,
        imageUrl: node.featuredImage?.url || null,
        shoppers: productStats.customerIds.size,
        stock:
          typeof node.totalInventory === "number" ? node.totalInventory : null,
      });
    });
  }

  const popular = Array.from(productData.values())
    .sort((a, b) => b.shoppers - a.shoppers)
    .slice(0, 8);

  const runningOut = Array.from(productData.values())
    .filter((product) =>
      typeof product.stock === "number"
        ? product.stock <= STOCK_THRESHOLD
        : false,
    )
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 8);

  return {
    shoppers,
    popular,
    runningOut,
    range,
    from: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
    to: toDate ? toDate.toISOString().slice(0, 10) : undefined,
  };
};

export default function Analytics() {
  const data = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const range = data.range || searchParams.get("range") || "last_7";
  const fromValue = data.from || "";
  const toValue = data.to || "";
  const [selectedRange, setSelectedRange] = useState(range);
  const [rangeValue, setRangeValue] = useState(
    fromValue && toValue ? `${fromValue}--${toValue}` : "",
  );

  return (
    <s-page heading="Metrics">
      <DateRangeFilter
        selectedRange={selectedRange}
        rangeValue={rangeValue}
        fromValue={fromValue}
        onRangeChange={(value) => {
          setSelectedRange(value);
          if (value !== "custom") {
            const params = new URLSearchParams();
            params.set("range", value);
            navigate(`/app/analytics?${params.toString()}`);
          }
        }}
        onCustomRangeChange={(nextValue) => {
          setRangeValue(nextValue);
          const [fromDate, toDate] = nextValue.split("--");
          if (!fromDate || !toDate) return;
          const params = new URLSearchParams();
          params.set("range", "custom");
          params.set("from", fromDate);
          params.set("to", toDate);
          navigate(`/app/analytics?${params.toString()}`);
        }}
      />

      <s-section padding="base">
        <div className="metrics-grid">
          <ShopperList shoppers={data.shoppers} />
          <ProductList
            title="Popular Products"
            subtitle="Wishlisted by most users"
            products={data.popular}
          />
          <ProductList
            title="Running out soon"
            subtitle="Low in stock, high on demand"
            products={data.runningOut}
            showStock
          />
        </div>
      </s-section>
    </s-page>
  );
}
