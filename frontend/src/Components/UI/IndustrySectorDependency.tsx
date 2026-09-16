import { useState, useEffect, useRef } from "react";
import { INDUSTRY_SECTORS } from "../../constants/vendorOnboardingData";
import ChipMultiSelect from "./ChipMultiSelect";
import "../../styles/industry_sector_dependency.css";

export interface SectorValue {
  public_sector: string[];
  private_sector: string[];
  non_profit_sector: string[];
}

const SECTOR_KEY_MAP: Record<string, keyof SectorValue> = {
  "Public Sector": "public_sector",
  "Private Sector": "private_sector",
  "Non-Profit": "non_profit_sector",
};

const CATEGORY_ORDER = ["Public Sector", "Private Sector", "Non-Profit"] as const;

export type SectorOptionNode = {
  label: string;
  options: { label: string; value: string }[];
};

interface IndustrySectorDependencyProps {
  labelName?: React.ReactNode;
  id?: string;
  sector: SectorValue;
  onChange: (sector: SectorValue) => void;
  defaultCategoryOption?: string;
  required?: boolean;
  /** When provided (e.g. BUYER_INDUSTRY_SECTORS), use instead of default vendor INDUSTRY_SECTORS */
  sectorOptions?: SectorOptionNode[];
  readOnly?: boolean;
}

function IndustrySectorDependency({
  labelName,
  id = "industry_sector",
  sector,
  onChange,
  defaultCategoryOption = "Select sector category",
  required,
  sectorOptions,
  readOnly = false,
}: IndustrySectorDependencyProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const hasInitializedFromSector = useRef(false);

  const sectorsSource = sectorOptions ?? INDUSTRY_SECTORS;

  useEffect(() => {
    if (hasInitializedFromSector.current) return;
    const hasData =
      (sector.public_sector?.length ?? 0) > 0 ||
      (sector.private_sector?.length ?? 0) > 0 ||
      (sector.non_profit_sector?.length ?? 0) > 0;
    if (hasData) {
      const first =
        sector.public_sector?.length
          ? "Public Sector"
          : sector.private_sector?.length
            ? "Private Sector"
            : "Non-Profit";
      setSelectedCategory(first);
      hasInitializedFromSector.current = true;
    }
  }, [sector]);

  const categoryOptions = sectorsSource.map((s) => s.label);
  const activeSectorNode = sectorsSource.find((s) => s.label === selectedCategory);
  const sectorKey = selectedCategory ? SECTOR_KEY_MAP[selectedCategory] : null;
  const selectedValues = sectorKey ? sector[sectorKey] ?? [] : [];

  function handleSectorOptionsChange(selected: string[]) {
    if (!sectorKey) return;
    onChange({
      ...sector,
      [sectorKey]: selected,
    });
  }

  const selectedAcrossCategories = CATEGORY_ORDER.map((label) => {
    const key = SECTOR_KEY_MAP[label];
    const values = key ? sector[key] ?? [] : [];
    return { label, values };
  }).filter((row) => row.values.length > 0);

  const otherSelectedCategories = selectedAcrossCategories.filter(
    (row) => row.label !== selectedCategory,
  );

  return (
    <div
      className={`industry-sector-dependency${readOnly ? " industry-sector-dependency--readonly" : ""}`}
      id={id}
    >
      {labelName != null && <label>{labelName}</label>}

      {otherSelectedCategories.length > 0 && (
        <div className="industry-sector-selected-summary" aria-live="polite">
          {otherSelectedCategories.map((row) => (
            <div key={row.label} className="industry-sector-selected-group">
              <span className="industry-sector-selected-group-label">{row.label}</span>
              <ul className="industry-sector-selected-chips">
                {row.values.map((value) => (
                  <li key={`${row.label}-${value}`} className="industry-sector-selected-chip">
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <select
        className={`industry-sector-category-select select_input ${!selectedCategory ? "select_input--placeholder" : ""}`}
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        aria-label="Sector category"
        required={required && selectedAcrossCategories.length === 0}
      >
        <option value="">{defaultCategoryOption}</option>
        {categoryOptions.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>

      {activeSectorNode && activeSectorNode.options.length > 0 ? (
        <ChipMultiSelect
          options={activeSectorNode.options}
          value={selectedValues}
          onChange={handleSectorOptionsChange}
          disabled={readOnly}
        />
      ) : null}
    </div>
  );
}

export default IndustrySectorDependency;
