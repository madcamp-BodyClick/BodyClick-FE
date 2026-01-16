"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  if (!value) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return new Date(year, month - 1, day);
};

const DatePickerField = ({
  label,
  value,
  onChange,
  placeholder = "날짜 선택",
}: DatePickerFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => parseDate(value), [value]);
  const displayValue = value || placeholder;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (wrapperRef.current && target) {
        if (!wrapperRef.current.contains(target)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-bm-border bg-bm-surface-soft px-3 text-sm text-bm-text transition hover:border-bm-border-strong"
      >
        <span className={value ? "text-bm-text" : "text-bm-muted"}>
          {displayValue}
        </span>
        <span className="text-bm-muted">▾</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-30 mt-2 rounded-2xl border border-bm-border bg-bm-panel p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                return;
              }
              onChange(formatDate(date));
              setIsOpen(false);
            }}
            captionLayout="dropdown"
            classNames={{
              root: "text-xs text-bm-text",
              months: "flex flex-col gap-3",
              month: "space-y-2",
              caption:
                "flex items-center justify-between gap-2 text-[11px] text-bm-muted",
              caption_label: "text-[11px] font-semibold text-bm-text",
              nav: "flex items-center gap-1",
              nav_button:
                "h-7 w-7 rounded-full border border-bm-border text-bm-muted transition hover:text-bm-text hover:border-bm-border-strong",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "w-9 text-center text-[10px] text-bm-muted",
              row: "flex",
              cell: "w-9 text-center",
              day: "h-8 w-8 rounded-full text-[11px] transition hover:bg-bm-accent-soft",
              day_selected:
                "bg-bm-accent text-black hover:bg-bm-accent-strong",
              day_today: "border border-bm-border-strong",
              day_outside: "text-bm-muted/60",
            }}
            fromYear={1930}
            toYear={new Date().getFullYear()}
            defaultMonth={selected ?? new Date(1995, 0, 1)}
          />
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="mt-2 w-full rounded-full border border-bm-border bg-bm-panel-soft px-3 py-1 text-[11px] text-bm-muted transition hover:text-bm-text"
          >
            날짜 지우기
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default DatePickerField;
