type SortToolbarProps = {
  sort: "asc" | "desc";
  onChange: (value: "asc" | "desc") => void;
};

export default function SortToolbar({ sort, onChange }: SortToolbarProps) {
  return (
    <div className="marketing-toolbar">
      <label className="marketing-label" htmlFor="sort">
        Sort by
      </label>
      <select
        id="sort"
        value={sort}
        onChange={(event) => onChange(event.target.value as "asc" | "desc")}
      >
        <option value="asc">Email (A-Z)</option>
        <option value="desc">Email (Z-A)</option>
      </select>
    </div>
  );
}
