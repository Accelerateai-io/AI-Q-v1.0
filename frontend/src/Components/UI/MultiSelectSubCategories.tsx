import { useState } from "react"; import "../../styles/multi_select_sub_categories.css";

interface OptionItem {
  label: string;
  value: string;
}

interface OptionGroup {
  label: string;
  options: OptionItem[];
}

interface MultiSelectSubCategoriesProps {
  labelName: React.ReactNode;
  id: string;
  options: OptionGroup[];
  default_option: string;
}
const MultiSelectSubCategories: React.FC<MultiSelectSubCategoriesProps> = ({
  labelName,
  id,
  options,
  default_option,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<boolean>(false);

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  // console.log("hello",options);

  return (
    <>
      <label htmlFor={id}>{labelName}</label>
      <div className="dropdown">
        <button type="button" onClick={() => setOpen(!open)}>
          {selected.length > 0 ? selected.join(", ") : default_option}
        </button>

        <div className={`menu ${open ? "open" : ""}`}>
          {options.map((group) => (
            <div key={group.label}>
              <strong>{group.label}</strong>
              {group.options.map((item) => (
                <label key={item.value}>
                
                  <input
                    type="checkbox"
                    checked={selected.includes(item.label)}
                    onChange={() => toggle(item.label)}
                    />
                    <span>  {item.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MultiSelectSubCategories;
