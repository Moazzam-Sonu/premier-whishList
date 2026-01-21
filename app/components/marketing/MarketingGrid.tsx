import type { MarketingRow } from "../../types/marketing";

type MarketingGridProps = {
  rows: MarketingRow[];
};

export default function MarketingGrid({ rows }: MarketingGridProps) {
  return (
    <div className="marketing-grid">
      {rows.map((row) => {
        const visible = row.products.slice(0, 4);
        const remaining = Math.max(0, row.products.length - visible.length);
        return (
          <div className="marketing-card" key={row.email}>
            <div className="marketing-card__header">
              <div className="marketing-card__avatar">
                {row.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="marketing-card__email">{row.email}</div>
                <div className="marketing-card__sub">{row.email}</div>
              </div>
            </div>
            <div className="marketing-card__summary">
              added {row.totalItems} items to wishlist
            </div>
            <div className="marketing-card__price">
              total $
              {row.totalPrice && row.totalPrice > 0
                ? row.totalPrice.toFixed(2)
                : "0.00"}
            </div>
            <div className="marketing-card__thumbs">
              {visible.map((product) => (
                <div className="marketing-card__thumb" key={product.id}>
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.title} />
                  )}
                </div>
              ))}
              {remaining > 0 && (
                <div className="marketing-card__more">+{remaining}</div>
              )}
            </div>
            <button type="button" className="marketing-card__btn" disabled>
              Send mail
            </button>
          </div>
        );
      })}
      {!rows.length && <div>No customers found.</div>}
    </div>
  );
}
