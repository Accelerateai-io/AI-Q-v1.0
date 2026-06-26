import { useState, useEffect, useRef } from "react";
import { INDUSTRY_SECTORS } from "../../constants/vendorOnboardingData";
import ChipMultiSelect from "./ChipMultiSelect";
import PublicSectorCheckboxes from "./PublicSectorCheckboxes";
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
}

function IndustrySectorDependency({
  labelName,
  id = "industry_sector",
  sector,
  onChange,
  defaultCategoryOption = "Select sector category",
  required,
  sectorOptions,
}: IndustrySectorDependencyProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const hasInitializedFromSector = useRef(false);

  const sectorsSource = sectorOptions ?? INDUSTRY_SECTORS;

  // When sector is prefilled from DB (e.g. Vendor Self Attestation), show first category that has data so user sees selected industries
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

  return (
    <div className="industry-sector-dependency" id={id}>
      {labelName != null && <label>{labelName}</label>}

      <select
        className={`industry-sector-category-select select_input ${!selectedCategory ? "select_input--placeholder" : ""}`}
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        aria-label="Sector category"
      >
        <option value="">{defaultCategoryOption}</option>
        {categoryOptions.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>

      {selectedCategory === "Public Sector" && (
        <PublicSectorCheckboxes
          value={selectedValues}
          onChange={handleSectorOptionsChange}
          aria-label="Public sector options"
        />
      )}
      {activeSectorNode &&
        activeSectorNode.options.length > 0 &&
        selectedCategory !== "Public Sector" && (
          <ChipMultiSelect
            options={activeSectorNode.options}
            value={selectedValues}
            onChange={handleSectorOptionsChange}
          />
        )}
    </div>
  );
}

export default IndustrySectorDependency;
