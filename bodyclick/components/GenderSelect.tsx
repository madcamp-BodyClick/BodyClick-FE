"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type GenderSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "default" | "compact";
  portal?: boolean;
};

const OPTIONS = [
  { value: "MALE", label: "남" },
  { value: "FEMALE", label: "여" },
];

const GenderSelect = ({
  label,
  value,
  onChange,
  size = "default",
  portal = true,
}: GenderSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedOption = OPTIONS.find((option) => option.value === value);
  const displayValue = selectedOption?.label ?? "선택";
  const isCompact = size === "compact";

  return (
    <div className={isCompact ? "space-y-0" : "space-y-2"}>
      <label
        className={
          isCompact
            ? "text-[10px] font-semibold uppercase tracking-[0.2em] text-bm-muted"
            : "text-xs font-semibold uppercase tracking-[0.2em] text-bm-muted"
        }
      >
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              isCompact
                ? "mt-1 h-8 w-full justify-between border-bm-border bg-bm-panel-soft text-xs text-bm-text hover:bg-bm-panel"
                : "h-11 w-full justify-between border-bm-border bg-bm-surface-soft text-sm text-bm-text hover:bg-bm-panel-soft",
              !value && "text-bm-muted",
            )}
          >
            {displayValue}
            <span className="text-bm-muted">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          portal={portal}
          className="w-48 border-bm-border bg-bm-panel p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        >
          <div className="space-y-1">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-bm-text/80 transition hover:bg-bm-accent-faint hover:text-bm-text",
                  value === option.value && "bg-bm-accent text-black",
                )}
              >
                <span>{option.label}</span>
                {value === option.value ? (
                  <span className="text-xs">✓</span>
                ) : null}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default GenderSelect;
