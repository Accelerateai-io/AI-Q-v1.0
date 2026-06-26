import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import "./reports.css";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export interface ReportsPaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** When provided, shows "Rows per page" dropdown and calls when user changes size. */
  onPageSizeChange?: (size: number) => void;
}

export function ReportsPagination({
  totalItems,
  currentPage,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  onPageSizeChange,
}: ReportsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const canFirst = currentPage > 1;
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;
  const canLast = currentPage < totalPages;

  return (
    <nav
      className="reports_pagination"
      aria-label="Reports pagination"
    >
      <div>
 {onPageSizeChange != null && (
        <>
          <span className="reports_pagination_rows_label">Rows per page:</span>
          <select
            className="reports_pagination_select"
            value={pageSize}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isNaN(value) && value > 0) {
                onPageSizeChange(value);
                onPageChange(1);
              }
            }}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </>
      )}
      <span className="reports_pagination_range">
        {totalItems === 0 ? "0-0 of 0" : `${start}-${end} of ${totalItems}`}
      </span>
      <div className="reports_pagination_buttons">
        <button
          type="button"
          className="reports_pagination_btn"
          onClick={() => onPageChange(1)}
          disabled={!canFirst}
          aria-label="Go to first page"
        >
          <ChevronsLeft size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="reports_pagination_btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          aria-label="Go to previous page"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="reports_pagination_btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          aria-label="Go to next page"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="reports_pagination_btn"
          onClick={() => onPageChange(totalPages)}
          disabled={!canLast}
          aria-label="Go to last page"
        >
          <ChevronsRight size={20} aria-hidden />
        </button>
      </div>
      </div>
     
    </nav>
  );
}

export const REPORTS_PAGE_SIZE = DEFAULT_PAGE_SIZE;
export const REPORTS_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
