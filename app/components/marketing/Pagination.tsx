type PaginationProps = {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
};

export default function Pagination({
  page,
  totalPages,
  makeHref,
}: PaginationProps) {
  return (
    <div className="marketing-pagination">
      <a
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={page <= 1 ? "disabled" : ""}
      >
        Prev
      </a>
      <span>
        Page {page} of {totalPages}
      </span>
      <a
        href={makeHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={page >= totalPages ? "disabled" : ""}
      >
        Next
      </a>
    </div>
  );
}
