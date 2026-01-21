import type { ProductRow } from "../../types/analytics";

type ProductListProps = {
  title: string;
  subtitle: string;
  products: ProductRow[];
  showStock?: boolean;
};

export default function ProductList({
  title,
  subtitle,
  products,
  showStock = false,
}: ProductListProps) {
  return (
    <div className="metrics-column">
      <div>
        <s-heading>{title}</s-heading>
        <s-text>{subtitle}</s-text>
      </div>
      <div className="metrics-list">
        {products.map((product) => (
          <div className="product" key={product.productId}>
            <div className="product-thumb">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.title} />
              )}
            </div>
            <div>
              <div className="product-title">{product.title}</div>
              <div className="product-meta">
                Users: {product.shoppers}
                {showStock && typeof product.stock === "number" && (
                  <span className="product-stock">
                    In stock: {product.stock}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
