// import React, { useState, useEffect } from "react";
import "../../styles/year_picker.css";

interface YearPickerProps {
  startYear?: number;
  endYear?: number;
  label?: React.ReactNode;
  value?: number;
  name?: string;
  id?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const YearPicker: React.FC<YearPickerProps> = ({
  startYear = 1950,
  endYear,
  label,
  value,
  name,
  id,
  onChange,
}) => {
  const currentYear = endYear ?? new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    if (onChange) onChange(e); // Pass the original event to parent
  };

  return (
    <div className="year-picker">
      {label && <label>{label}</label>}
      <select
        value={value ?? ""}
        onChange={handleChange}
        name={name}
        id={id}
        className={`select_input ${value == null || value === "" ? "select_input--placeholder" : ""}`}
      >
        <option value="">Select year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
};

export default YearPicker;
