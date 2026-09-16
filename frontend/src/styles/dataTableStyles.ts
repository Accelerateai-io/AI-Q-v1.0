/** Shared react-data-table-component styles — screenshot table UI. */
export const premiumDataTableStyles = {
  table: {
    style: {
      width: "100%",
      backgroundColor: "transparent",
      border: "none",
      borderRadius: 0,
    },
  },
  tableWrapper: {
    style: {
      backgroundColor: "transparent",
      borderRadius: 0,
      border: "none",
    },
  },
  headRow: {
    style: {
      backgroundColor: "var(--table-header-bg, #edf2ff)",
      borderBottomWidth: "2px",
      borderBottomStyle: "solid" as const,
      borderBottomColor: "var(--table-header-border, var(--border-strong, #c5d0ea))",
      minHeight: "unset",
    },
  },
  headCells: {
    style: {
      backgroundColor: "var(--table-header-bg, #edf2ff)",
      color: "var(--table-header-text, var(--text-muted, #64748b))",
      fontSize: "0.75rem",
      fontWeight: 600,
      letterSpacing: "0.03rem",
      textTransform: "uppercase" as const,
      borderBottom: "2px solid var(--table-header-border, var(--border-strong, #c5d0ea))",
      borderRight: "none",
      paddingLeft: "15px",
      paddingRight: "15px",
      paddingTop: "15px",
      paddingBottom: "15px",
      textAlign: "left" as const,
      verticalAlign: "middle" as const,
    },
  },
  rows: {
    style: {
      backgroundColor: "var(--table-row-bg, #f3f0ee)",
      minHeight: "40px",
      borderBottomWidth: "0px",
      borderBottomColor: "transparent",
      borderBottomStyle: "none" as const,
    },
    stripedStyle: {
      backgroundColor: "var(--table-row-alt, whitesmoke)",
      borderBottomWidth: "0px",
      borderBottomColor: "transparent",
      borderBottomStyle: "none" as const,
    },
    highlightOnHoverStyle: {
      backgroundColor: "var(--table-row-hover, inherit)",
      borderBottomWidth: "0px",
      borderBottomColor: "transparent",
      borderBottomStyle: "none" as const,
      outline: "none",
      cursor: "default",
    },
  },
  cells: {
    style: {
      backgroundColor: "transparent",
      color: "var(--text-primary, #475569)",
      fontSize: "13px",
      fontWeight: 400,
      borderBottomWidth: "0px",
      borderBottomStyle: "none" as const,
      borderBottomColor: "transparent",
      borderRight: "none",
      paddingLeft: "1rem",
      paddingRight: "1rem",
      paddingTop: "0.4rem",
      paddingBottom: "0.4rem",
      textAlign: "left" as const,
      verticalAlign: "middle" as const,
    },
  },
  pagination: {
    style: {
      backgroundColor: "transparent",
      borderTop: "none",
      borderBottom: "none",
      color: "var(--text-muted, #64748b)",
    },
  },
};

/** Org Configuration tables — no nested H/V scrollbars (columns fit the page). */
export const orgControlDataTableStyles = {
  ...premiumDataTableStyles,
  table: {
    style: {
      ...premiumDataTableStyles.table.style,
      height: "auto",
    },
  },
  tableWrapper: {
    style: {
      ...premiumDataTableStyles.tableWrapper.style,
      overflow: "visible",
      height: "auto",
    },
  },
  responsiveWrapper: {
    style: {
      overflowX: "visible" as const,
      overflowY: "visible" as const,
    },
  },
};
