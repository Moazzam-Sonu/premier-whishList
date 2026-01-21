import type { ShopperRow } from "../../types/analytics";

type ShopperListProps = {
  shoppers: ShopperRow[];
};

export default function ShopperList({ shoppers }: ShopperListProps) {
  return (
    <div className="metrics-column">
      <div>
        <s-heading>Shoppers</s-heading>
        <s-text>Who interacted the most on Wishlist</s-text>
      </div>
      <div className="metrics-list">
        {shoppers.map((shopper) => (
          <div className="shopper" key={shopper.email}>
            <div className="shopper-avatar">
              {shopper.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="shopper-email">{shopper.email}</div>
              <div className="shopper-detail">added {shopper.count} products</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
