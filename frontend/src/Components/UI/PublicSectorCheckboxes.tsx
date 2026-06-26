import "../../styles/public_sector_checkboxes.css";

/**
 * Reusable custom multi-checkbox for Public Sector options.
 * Uses real <input type="checkbox"> (visually hidden) for accessibility.
 *
 * Example usage with conditional rendering when sector is public:
 *
 *   const [sectorCategory, setSectorCategory] = useState("");
 *   const [publicSectorValues, setPublicSectorValues] = useState<string[]>([]);
 *
 *   return (
 *     <>
 *       <select
 *         value={sectorCategory}
 *         onChange={(e) => setSectorCategory(e.target.value)}
 *       >
 *         <option value="">Select sector</option>
 *         <option value="public">Public Sector</option>
 *         <option value="private">Private Sector</option>
 *       </select>
 *       {sectorCategory === "public" && (
 *         <PublicSectorCheckboxes
 *           value={publicSectorValues}
 *           onChange={setPublicSectorValues}
 *         />
 *       )}
 *     </>
 *   );
 */

/** Public sector options – exact labels for the checkbox group */
export const PUBLIC_SECTOR_OPTIONS = [
  "Federal Government (US)",
  "State Government (US)",
  "Local Government (US)",
  "International Governments",
  "Educational Institutions (Public)",
  "Public Healthcare Systems",
  "Public Utilities",
  "Defense & Military",
  "Law Enforcement & Emergency Services",
] as const;

export type PublicSectorOption = (typeof PUBLIC_SECTOR_OPTIONS)[number];

interface PublicSectorCheckboxesProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  "aria-label"?: string;
}

function PublicSectorCheckboxes({
  value,
  onChange,
  id = "public-sector-checkboxes",
  "aria-label": ariaLabel = "Public sector options",
}: PublicSectorCheckboxesProps) {
  function toggle(option: string) {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(next);
  }

  return (
    <div
      className="public-sector-checkboxes"
      id={id}
      role="group"
      aria-label={ariaLabel}
    >
      <div className="public-sector-checkboxes-grid">
        {PUBLIC_SECTOR_OPTIONS.map((option) => {
          const checked = value.includes(option);
          return (
            <label key={option} className="public-sector-checkbox-item">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
                value={option}
                className="public-sector-checkbox-input"
                aria-label={option}
              />
              <span className="public-sector-checkbox-label">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default PublicSectorCheckboxes;
