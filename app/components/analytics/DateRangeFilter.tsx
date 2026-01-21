import type { DateRangeFilterProps } from "../../types/analytics";

export default function DateRangeFilter({
  selectedRange,
  rangeValue,
  fromValue,
  onRangeChange,
  onCustomRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="metrics-header">
      <s-select
        label="Date range"
        value={selectedRange}
        onChange={(event) => {
          const value =
            (
              event as unknown as {
                detail?: { value?: string };
                target?: { value?: string };
              }
            )?.detail?.value ||
            (event as unknown as { target?: { value?: string } })?.target
              ?.value ||
            "last_7";
          onRangeChange(value);
        }}
      >
        <s-option value="today">Today</s-option>
        <s-option value="yesterday">Yesterday</s-option>
        <s-option value="last_7">Last 7 days</s-option>
        <s-option value="last_30">Last 30 days</s-option>
        <s-option value="last_90">Last 90 days</s-option>
        <s-option value="custom">Custom</s-option>
      </s-select>

      {selectedRange === "custom" && (
        <div className="metrics-picker">
          <s-date-picker
            view={fromValue ? fromValue.slice(0, 7) : "2025-05"}
            type="range"
            value={rangeValue}
            onChange={(event) => {
              const detail = (
                event as unknown as {
                  detail?: {
                    value?: string;
                    start?: string;
                    end?: string;
                    from?: string;
                    to?: string;
                  };
                }
              )?.detail;
              const from = detail?.start || detail?.from;
              const to = detail?.end || detail?.to;
              const nextValue =
                detail?.value ||
                (from && to ? `${from}--${to}` : "") ||
                (event as unknown as { target?: { value?: string } })?.target
                  ?.value ||
                "";
              onCustomRangeChange(nextValue);
            }}
          />
        </div>
      )}
    </div>
  );
}
