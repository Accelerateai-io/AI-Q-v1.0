import { useState } from "react";
import '../../styles/multi_select_sub_categories.css';

interface OptionGroup {
  label: string;
  value: string;
}

interface MultiSelectProps {
  labelName: React.ReactNode;
  id: string;
  options: OptionGroup[];
  value: string[]; // controlled selected values
  default_option: string;
  onChange: (selected: string[]) => void; // notify parent
}

const MultiSelectDropDown = ({
  labelName,
  id,
  options,
  value,
  default_option,
  onChange,
}: MultiSelectProps) => {
  const [open, setOpen] = useState(false);

  // Toggle selection
  const toggle = (item: string) => {
    const newSelected = value.includes(item)
      ? value.filter((i) => i !== item)
      : [...value, item];
    onChange(newSelected);
  };

  return (
    <div className="dropdown_multi_select">
      <label htmlFor={id}>{labelName}</label>
      <button type="button" onClick={() => setOpen(!open)}>
        {value.length > 0 ? value.join(", ") : default_option}
      </button>

      <div className={`menu ${open ? "open" : ""}`}>
        {options.map((group) => (
          <label key={group.label}>
            <input
              type="checkbox"
              value={group.label}
              checked={value.includes(group.label)}
              onChange={() => toggle(group.label)}
            />
            <span> {group.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MultiSelectDropDown;
