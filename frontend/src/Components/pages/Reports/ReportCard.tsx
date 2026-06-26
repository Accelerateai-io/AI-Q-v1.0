import type { ReactNode } from "react"
import { FileText, Download, Trash2 } from "lucide-react"

export interface ReportCardProps {
  /** Report id for navigation */
  reportId: string
  /** Main title (e.g. "AI Vendor Assessment: MedicarAI for Mount Sinai...") */
  title: string
  /** Metadata line (e.g. "Vendor Assessment Report • 22/1/2026") */
  meta: string
  /** Expires on date (formatted, e.g. "05-Jun-2026"); shown below meta when set */
  expiry?: string | null
  /** When true: show Archived tag, hide download, show delete button */
  archived?: boolean
  /** Status label (e.g. "Published" or "Archived") */
  status?: string
  /** Icon (default: FileText in purple container) */
  icon?: ReactNode
  /** Callback when card is clicked (e.g. navigate). If not provided, uses default link behavior. */
  onSelect?: (reportId: string) => void
  /** Callback when download is clicked; prevents navigation if provided */
  onDownload?: (reportId: string, e: React.MouseEvent) => void
  /** Callback when delete is clicked (archived reports only) */
  onDelete?: (reportId: string, e: React.MouseEvent) => void
}

function ReportCard({
  reportId,
  title,
  meta,
  expiry,
  archived = false,
  status,
  icon,
  onSelect,
  onDownload,
  onDelete,
}: ReportCardProps) {
  const displayStatus = status ?? (archived ? "Archived" : "Published")

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".report_card_download") || (e.target as HTMLElement).closest(".report_card_delete")) {
      return
    }
    // if (archived) return
    if (onSelect) {
      e.preventDefault()
      onSelect(reportId)
    }
  }

  const content = (
    <>
      <span className="report_card_icon" aria-hidden>
        {icon ?? <FileText size={22} />}
      </span>
      <div className="report_card_content">
        <p className="report_card_title">{title}</p>
        {/* <p className="report_card_meta">{meta}</p> */}
        {expiry != null && expiry !== "" && !archived && (
          <p className="report_card_expiry">Expires on: {expiry}</p>
        )}
      </div>
      <div className="report_card_actions">
        {displayStatus && (
          <span className={`report_card_status ${archived ? "report_card_status_archived" : ""}`}>
            {displayStatus}
          </span>
        )}
        {!archived && (
          <button
            type="button"
            className="report_card_download"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDownload?.(reportId, e)
            }}
            aria-label="Download report"
          >
            <Download size={20} />
          </button>
        )}
        {/* {archived && onDelete && (
          <button
            type="button"
            className="report_card_delete report_card_delete_icon_only report_card_download"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(reportId, e)
            }}
            aria-label="Delete report"
          >
            <Trash2 size={18} />
          </button>
        )} */}
      </div>
    </>
  )

  if (onSelect) {
    return (
      <div
        role={archived ? undefined : "button"}
        tabIndex={archived ? undefined : 0}
        className={`report_card`}
        // className={`report_card${archived ? " report_card_archived" : ""}`}
        onClick={handleClick}
        onKeyDown={
          archived
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect?.(reportId)
                }
              }
        }
      >
        {content}
      </div>
    )
  }

  return (
    <a href={`/reports/${reportId}`} className="report_card">
      {content}
    </a>
  )
}

export default ReportCard
