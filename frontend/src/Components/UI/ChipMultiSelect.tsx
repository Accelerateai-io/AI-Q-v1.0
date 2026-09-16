import { useRef } from "react";
import "../../styles/chip_multi_select.css";

export interface ChipOption {
  label: string;
  value: string;
}

interface ChipMultiSelectProps {
  id?: string;
  labelName?: React.ReactNode;
  description?: string;
  options: ChipOption[];
  value: string[];
  onChange: (selected: string[]) => void;
  /**
   * When set, this option cannot be combined with any other selection:
   * if it is selected, all other chips are disabled; if anything else is selected, this chip is disabled.
   * Selecting this option replaces the current selection with only this value.
   */
  globalExclusiveValue?: string;
  disabled?: boolean;
}

function ChipMultiSelect({
  id,
  labelName,
  description,
  options,
  value,
  onChange,
  globalExclusiveValue,
  disabled = false,
}: ChipMultiSelectProps) {
  const valueRef = useRef(value);
  valueRef.current = value;

  function isChipDisabled(optionValue: string): boolean {
    if (disabled) return true;
    if (!globalExclusiveValue) return false;
    const current = valueRef.current;
    const hasGlobal = current.includes(globalExclusiveValue);
    const hasNonGlobal = current.some((v) => v !== globalExclusiveValue);
    if (hasGlobal && hasNonGlobal) return false;
    if (hasGlobal && optionValue !== globalExclusiveValue) return true;
    if (hasNonGlobal && optionValue === globalExclusiveValue) return true;
    return false;
  }

  function toggle(optionValue: string) {
    const current = valueRef.current;
    if (globalExclusiveValue) {
      if (isChipDisabled(optionValue)) return;

      if (optionValue === globalExclusiveValue) {
        const next = current.includes(globalExclusiveValue)
          ? current.filter((v) => v !== globalExclusiveValue)
          : [globalExclusiveValue];
        valueRef.current = next;
        onChange(next);
        return;
      }

      const withoutGlobal = current.filter((v) => v !== globalExclusiveValue);
      const next = withoutGlobal.includes(optionValue)
        ? withoutGlobal.filter((v) => v !== optionValue)
        : [...withoutGlobal, optionValue];
      valueRef.current = next;
      onChange(next);
      return;
    }

    const next = current.includes(optionValue)
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];
    valueRef.current = next;
    onChange(next);
  }

  return (
    <div className="chip-multi-select" id={id}>
      {labelName != null && <label>{labelName}</label>}
      {description != null && description !== "" && (
        <p className="chip-multi-select-description">{description}</p>
      )}
      <div className="chip-multi-select-grid" role="group">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          const disabled = isChipDisabled(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              className={`chip-multi-select-chip ${selected ? "chip-multi-select-chip--selected" : ""}${disabled ? " chip-multi-select-chip--disabled" : ""}`}
              onClick={() => toggle(opt.value)}
              aria-pressed={selected}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChipMultiSelect;
