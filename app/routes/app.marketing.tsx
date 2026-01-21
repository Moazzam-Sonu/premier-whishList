import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import "../styles/marketing.css";
import SortToolbar from "../components/marketing/SortToolbar";
import MarketingGrid from "../components/marketing/MarketingGrid";
import Pagination from "../components/marketing/Pagination";
import type {
  BaseRow,
  LoaderData,
  MarketingRow,
  ProductSummary,
} from "../types/marketing";

const PAGE_SIZE = 20;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get("page") || "1");
  const sortParam = url.searchParams.get("sort") === "desc" ? "desc" : "asc";
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const shop =
    (await prisma.shop.findUnique({ where: { shopDomain } })) ||
    (await prisma.shop.findFirst());
  if (!shop) return { rows: [], page: 1, totalPages: 1, sort: sortParam };

  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      wishlists: {
        include: { items: true },
      },
    },
  });

  const baseRows: BaseRow[] = customers
    .filter((customer) => !!customer.email)
    .map((customer) => {
      const items = customer.wishlists.flatMap((wishlist) => wishlist.items);
      const productIds = Array.from(
        new Set(items.map((item) => item.productId)),
      );
      const productCounts = items.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.productId] = (acc[item.productId] || 0) + 1;
          return acc;
        },
        {},
      );
      return {
        email: customer.email || "",
        totalItems: items.length,
        productIds,
        productCounts,
      };
    });

  const sortedRows = baseRows.sort((a, b) => {
    if (sortParam === "desc") {
      return b.email.localeCompare(a.email);
    }
    return a.email.localeCompare(b.email);
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const productIds = Array.from(
    new Set(pagedRows.flatMap((row) => row.productIds)),
  );
  const productMap = new Map<string, ProductSummary>();

  const chunk = (list: string[], size: number) => {
    const result: string[][] = [];
    for (let i = 0; i < list.length; i += size) {
      result.push(list.slice(i, i + size));
    }
    return result;
  };

  type ProductNode = {
    id: string;
    title: string;
    handle: string;
    featuredImage?: { url: string } | null;
    variants?: {
      edges?: Array<{ node?: { price?: string | null } }>;
    };
  };

  for (const ids of chunk(productIds, 50)) {
    const gids = ids.map((id) => `gid://shopify/Product/${id}`);
    const response = await admin.graphql(
      `#graphql
        query MarketingProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              handle
              featuredImage { url }
              variants(first: 1) {
                edges {
                  node {
                    price
                  }
                }
              }
            }
          }
        }`,
      { variables: { ids: gids } },
    );
    const data = await response.json();
    const nodes = data?.data?.nodes || [];
    (nodes as Array<ProductNode | null>).forEach((node) => {
      if (!node) return;
      const numericId = node.id.split("/").pop() || "";
      const priceValue = Number(
        node.variants?.edges?.[0]?.node?.price || "0",
      );
      const price = Number.isNaN(priceValue) ? null : priceValue;
      productMap.set(numericId, {
        id: numericId,
        title: node.title,
        handle: node.handle,
        imageUrl: node.featuredImage?.url || null,
        price,
      });
    });
  }

  const rows: MarketingRow[] = pagedRows.map((row) => ({
    email: row.email,
    totalItems: row.totalItems,
    products: row.productIds
      .map((id) => productMap.get(id))
      .filter((item): item is ProductSummary => !!item),
    totalPrice: row.productIds.reduce((total, id) => {
      const product = productMap.get(id);
      const count = row.productCounts[id] || 0;
      if (!product?.price) return total;
      return total + product.price * count;
    }, 0),
  }));

  return { rows, page: safePage, totalPages, sort: sortParam };
};

export default function Marketing() {
  const { rows, page, totalPages, sort } = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    params.set("sort", sort);
    return `/app/marketing?${params.toString()}`;
  };

  return (
    <s-page heading="Marketing">
      <s-section padding="base">
        <SortToolbar
          sort={sort}
          onChange={(value) => {
            const params = new URLSearchParams(searchParams);
            params.set("sort", value);
            params.set("page", "1");
            navigate(`/app/marketing?${params.toString()}`);
          }}
        />

        <MarketingGrid rows={rows} />

        <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </s-section>
    </s-page>
  );
}
