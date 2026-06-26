/**
 * Kebab menu (three horizontal dots) with dropdown options.
 * Use for actions like "View Product", "Edit", etc.
 */
import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import "./KebabMenu.css";

export interface KebabMenuOption {
  label: string;
  onClick: () => void;
}

export interface KebabMenuProps {
  options: KebabMenuOption[];
  /** Accessible label for the button */
  ariaLabel?: string;
}

export default function KebabMenu({ options, ariaLabel = "Actions" }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="kebab_menu_wrapper" ref={menuRef}>
      <button
        type="button"
        className="kebab_menu_btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <MoreHorizontal size={20} aria-hidden />
      </button>
      {open && (
        <ul className="kebab_menu_dropdown" role="menu">
          {options.map((opt, i) => (
            <li key={i} role="none">
              <button
                type="button"
                role="menuitem"
                className="kebab_menu_option"
                onClick={() => {
                  opt.onClick();
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
