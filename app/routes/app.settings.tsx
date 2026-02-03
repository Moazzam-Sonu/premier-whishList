import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type LoaderData = {
  klaviyoPrivateKey: string | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop =
    (await prisma.shop.findUnique({
      where: { shopDomain: session.shop },
    })) ||
    (await prisma.shop.create({
      data: {
        shopDomain: session.shop,
        accessToken: session.accessToken || "",
      },
    }));
  return { klaviyoPrivateKey: shop.klaviyoPrivateKey || null };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const rawKey = String(formData.get("klaviyoPrivateKey") || "").trim();
  const key = rawKey.length ? rawKey : null;

  await prisma.shop.upsert({
    where: { shopDomain: session.shop },
    create: {
      shopDomain: session.shop,
      accessToken: session.accessToken || "",
      klaviyoPrivateKey: key,
    },
    update: {
      klaviyoPrivateKey: key,
      accessToken: session.accessToken || undefined,
    },
  });

  return { success: true };
};

export default function Settings() {
  const { klaviyoPrivateKey } = useLoaderData<LoaderData>();

  return (
    <s-page heading="Settings">
      <s-section heading="Klaviyo Integration">
        <s-paragraph>
          Add your Klaviyo Private API Key so the Marketing button can trigger
          your Klaviyo flow.
        </s-paragraph>
        <form method="post">
          <div style={{ maxWidth: 480 }}>
            <label htmlFor="klaviyoPrivateKey">Private API Key</label>
            <input
              id="klaviyoPrivateKey"
              name="klaviyoPrivateKey"
              type="password"
              defaultValue={klaviyoPrivateKey || ""}
              placeholder="pk_live_..."
              style={{
                width: "100%",
                marginTop: 6,
                padding: "8px 10px",
                border: "1px solid #d6d6d6",
                borderRadius: 8,
              }}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <s-button type="submit">Save</s-button>
          </div>
        </form>
        <s-paragraph>
          Tip: In Klaviyo, create a Flow triggered by the custom event
          <strong> Wishlist Marketing Email</strong>.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
