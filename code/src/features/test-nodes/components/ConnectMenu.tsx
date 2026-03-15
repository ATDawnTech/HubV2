import { useEffect, useRef } from "react";
import type { JSX } from "react";
import type { TestNodeType } from "../types";

const MENU_W = 160;
const MENU_ITEM_H = 36;
const MENU_HEADER_H = 32;

interface NodeTypeOption {
  type: TestNodeType;
  label: string;
  color: string;
}

interface ConnectMenuProps {
  x: number;
  y: number;
  wrapperEl: HTMLElement | null;
  items: NodeTypeOption[];
  onSelect: (type: TestNodeType) => void;
  autoFocus?: true;
}

export function ConnectMenu({ x, y, wrapperEl, items, onSelect, autoFocus }: ConnectMenuProps): JSX.Element {
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus) firstBtnRef.current?.focus();
  }, [autoFocus]);

  const menuH = MENU_HEADER_H + items.length * MENU_ITEM_H;
  const wrapperW = wrapperEl?.offsetWidth ?? 9999;
  const wrapperH = wrapperEl?.offsetHeight ?? 9999;
  const left = x + MENU_W > wrapperW ? x - MENU_W : x;
  const top = y + menuH > wrapperH ? y - menuH : y;

  return (
    <div
      className="absolute z-50 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-xl"
      style={{ left, top }}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Add Node
      </div>
      {items.map((item, i) => (
        <button
          key={item.type}
          ref={i === 0 ? firstBtnRef : undefined}
          onClick={() => onSelect(item.type)}
          className={`flex w-full items-center px-3 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${item.color}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
