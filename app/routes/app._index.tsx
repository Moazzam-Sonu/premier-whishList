import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="Premier WishList Overview">
      <s-section heading="Klaviyo Email Setup (for Merchants)">
        <s-paragraph>
          Follow these steps so the Marketing "Send mail" button can trigger
          your Klaviyo flow:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Install the Klaviyo Shopify app and connect your store.
          </s-list-item>
          <s-list-item>In Klaviyo, create a Private API Key.</s-list-item>
          <s-list-item>
            Go to <s-link href="/app/settings">Settings</s-link> and save the key.
          </s-list-item>
          <s-list-item>
            Create a Klaviyo Flow triggered by the custom event "Wishlist
            Marketing Email".
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
