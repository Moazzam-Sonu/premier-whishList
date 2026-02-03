import type { MarketingRow } from "../../types/marketing";

type MarketingGridProps = {
  rows: MarketingRow[];
  onSend?: (row: MarketingRow) => void;
  sendingEmail?: string | null;
  selectedEmails?: Set<string>;
  onToggleSelect?: (email: string) => void;
};

export default function MarketingGrid({
  rows,
  onSend,
  sendingEmail,
  selectedEmails,
  onToggleSelect,
}: MarketingGridProps) {
  return (
    <div className="marketing-grid">
      {rows.map((row) => {
        const visible = row.products.slice(0, 4);
        const remaining = Math.max(0, row.products.length - visible.length);
        const isSelected = selectedEmails?.has(row.email) || false;
        return (
          <div
            className={`marketing-card${isSelected ? " is-selected" : ""}`}
            key={row.email}
          >
            <div className="marketing-card__header">
              <label className="marketing-card__select marketing-card__select--top">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect?.(row.email)}
                />
              </label>
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
            <button
              type="button"
              className="marketing-card__btn"
              onClick={() => onSend?.(row)}
              disabled={!onSend || sendingEmail === row.email}
            >
              {sendingEmail === row.email ? "Sending..." : "Send mail"}
            </button>
          </div>
        );
      })}
      {!rows.length && <div>No customers found.</div>}
    </div>
  );
}
