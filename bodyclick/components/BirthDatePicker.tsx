"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type BirthDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "default" | "compact";
  portal?: boolean;
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

const formatDate = (date: Date) => format(date, "yyyy.MM.dd");

const BirthDatePicker = ({
  label,
  value,
  onChange,
  placeholder = "생년월일 선택",
  size = "default",
  portal = true,
}: BirthDatePickerProps) => {
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const displayValue = selectedDate ? formatDate(selectedDate) : placeholder;
  const today = useMemo(() => new Date(), []);
  const hasDefaultedRef = useRef(false);
  const isCompact = size === "compact";
  const [displayMonth, setDisplayMonth] = useState<Date>(
    selectedDate ?? today,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!value && !hasDefaultedRef.current) {
      onChange(format(today, "yyyy-MM-dd"));
      hasDefaultedRef.current = true;
    }
  }, [onChange, today, value]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = today.getFullYear(); year >= 1930; year -= 1) {
      years.push(year);
    }
    return years;
  }, [today]);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index),
    [],
  );

  const handleMonthChange = (monthIndex: number) => {
    setDisplayMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1));
    setIsMonthOpen(false);
  };

  const handleYearChange = (year: number) => {
    setDisplayMonth((prev) => new Date(year, prev.getMonth(), 1));
    setIsYearOpen(false);
  };

  return (
    <div className={isCompact ? "space-y-0" : "space-y-2"}>
      <label
        className={
          isCompact
            ? "text-[10px] font-semibold uppercase tracking-[0.2em] text-bm-muted"
            : "text-sm font-semibold uppercase tracking-[0.2em] text-bm-muted"
        }
      >
        {label}
      </label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              isCompact
                ? "mt-1 h-8 w-full justify-between border-bm-border bg-bm-panel-soft text-xs text-bm-text hover:bg-bm-panel"
                : "h-11 w-full justify-between border-bm-border bg-bm-surface-soft text-sm text-bm-text hover:bg-bm-panel-soft",
              !selectedDate && "text-bm-muted",
            )}
          >
            {displayValue}
            <span className="text-bm-muted">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          portal={portal}
          className="w-auto border-bm-border bg-bm-panel p-0 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <Popover
              open={isMonthOpen}
              onOpenChange={(open) => {
                setIsMonthOpen(open);
                if (open) {
                  setIsYearOpen(false);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-full border border-bm-border bg-bm-panel px-4 text-xs font-semibold text-bm-text/80 hover:bg-bm-panel-soft/60 hover:text-bm-text/90"
                >
                  {displayMonth.getMonth() + 1}월
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-40 border-bm-border bg-bm-panel p-2"
              >
                <div className="grid grid-cols-3 gap-2">
                  {monthOptions.map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => handleMonthChange(month)}
                      className={cn(
                        "min-w-[48px] whitespace-nowrap rounded-md px-2 py-1 text-xs text-bm-text/80 transition hover:bg-bm-accent-faint hover:text-bm-text/90",
                        month === displayMonth.getMonth() &&
                          "bg-bm-accent text-black",
                      )}
                    >
                      {month + 1}월
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover
              open={isYearOpen}
              onOpenChange={(open) => {
                setIsYearOpen(open);
                if (open) {
                  setIsMonthOpen(false);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-full border border-bm-border bg-bm-panel px-4 text-xs font-semibold text-bm-text/80 hover:bg-bm-panel-soft/60 hover:text-bm-text/90"
                >
                  {displayMonth.getFullYear()}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-36 border-bm-border bg-bm-panel p-2"
              >
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearChange(year)}
                      className={cn(
                        "w-full rounded-md px-2 py-1 text-left text-xs text-bm-text/80 transition hover:bg-bm-accent-faint hover:text-bm-text/90",
                        year === displayMonth.getFullYear() &&
                          "bg-bm-accent text-black",
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Calendar
            mode="single"
            captionLayout="label"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              if (date) {
                setIsOpen(false);
              }
            }}
            fromYear={1930}
            toYear={today.getFullYear()}
            disabled={{ after: today }}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            className="p-2 pt-1 text-sm"
            classNames={{
              root: "bg-bm-panel text-bm-text",
              months: "flex flex-col gap-1",
              month: "space-y-1",
              caption: "hidden",
              dropdowns: "hidden",
              caption_label: "hidden",
              nav: "hidden",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "w-9 text-center text-xs text-bm-muted",
              row: "flex",
              cell: "w-9 text-center",
              day: "h-8 w-8 rounded-full text-sm text-bm-text/80 transition hover:bg-bm-accent-soft hover:text-bm-text",
              day_selected:
                "bg-bm-accent text-black hover:bg-bm-accent-strong",
            }}
          />
          <div className="border-t border-bm-border px-4 py-2">
            <button
              type="button"
              className="w-full text-xs text-bm-muted transition hover:text-bm-text"
              onClick={() => onChange("")}
            >
              날짜 지우기
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default BirthDatePicker;
