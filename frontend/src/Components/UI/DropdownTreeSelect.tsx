import { useState, useEffect, useRef } from "react";
import { PlusIcon, MinusIcon } from "lucide-react";
import "../../styles/dropdown_tree_select.css";

export interface TreeNodeType {
  label: string;
  options?: TreeNodeType[];
}

interface TreeNodeProps {
  node: TreeNodeType;
  selected: string[];
  toggleSelect: (node: TreeNodeType) => void;
  expanded: string[];
  toggleExpand: (label: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  selected,
  toggleSelect,
  expanded,
  toggleExpand,
}) => {
  const hasChildren = node.options && node.options.length > 0;
  const isExpanded = expanded.includes(node.label);

  const isNodeSelected = (node: TreeNodeType, selected: string[]): boolean => {
  if (!node.options) return selected.includes(node.label);
  // A parent node is "selected" if **all children** are selected
  return node.options.every((child) => isNodeSelected(child, selected));
};


  return (
    <li className="tree-node">
      <div
        className={`tree_node_list ${selected.includes(node.label) ? "selected-row" : ""}`}
      >
        {hasChildren && (
          <div
            className="tree_node_list_icons"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.label);
            }}
          >
            {isExpanded ? <MinusIcon size={24} /> : <PlusIcon size={24} />}
          </div>
        )}
        <input
          type="checkbox"
          checked={isNodeSelected(node, selected)}
          onChange={() => {
            console.log("Toggling:", node.label, "selected:", selected);
            toggleSelect(node);
          }}
        />

        <p onClick={() => toggleSelect(node)}>{node.label}</p>
      </div>

      {hasChildren && isExpanded && (
        <ul className="tree_node_sublist">
          {node.options!.map((child) => (
            <TreeNode
              key={child.label}
              node={child}
              selected={selected}
              toggleSelect={toggleSelect}
              expanded={expanded}
              toggleExpand={toggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface DropdownTreeSelectProps {
  labelName?: React.ReactNode;
  id?: string;
  default_option?: string;
  options: TreeNodeType[];
  value: string[]; // controlled
  onChange: (selectedValues: string[]) => void;
  required?: boolean;
}

const DropdownTreeSelect: React.FC<DropdownTreeSelectProps> = ({
  labelName,
  id,
  default_option = "Select Industry Sector",
  options,
  value,
  onChange,
  // required,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleSelect = (node: TreeNodeType) => {
    const getAllLabels = (n: TreeNodeType): string[] =>
      !n.options ? [n.label] : [n.label, ...n.options.flatMap(getAllLabels)];

    const allLabels = getAllLabels(node);
    const anySelected = allLabels.some((label) => value.includes(label));

    if (anySelected) {
      onChange(value.filter((v) => !allLabels.includes(v)));
    } else {
      onChange([...value, ...allLabels]);
    }
  };

  const toggleExpand = (label: string) => {
    setExpandedNodes((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="treedropdown" ref={dropdownRef} id={id}>
      {labelName && <label>{labelName}</label>}

      <div
        className="tree-dropdown-btn"
        // onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        {value.length === 0 && (
          <span className="placeholder">{default_option}</span>
        )}

        <div className="selected-tags">
          {value.map((item) => (
            <p key={item} className="tag">
              {item}
              <span
                className="remove-tag"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((v) => v !== item));
                }}
              >
                ×
              </span>
            </p>
          ))}
        </div>
      </div>

      {!dropdownOpen && (
        <div className="tree-dropdown-content">
          <ul className="tree">
            {options.map((node) => (
              <TreeNode
                key={node.label}
                node={node}
                selected={value}
                toggleSelect={toggleSelect}
                expanded={expandedNodes}
                toggleExpand={toggleExpand}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DropdownTreeSelect;
