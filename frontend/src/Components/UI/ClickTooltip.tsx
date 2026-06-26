import { useState, useEffect, useRef, useId } from "react"
import type { ReactNode } from "react"
import "./ClickTooltip.css"

interface ClickTooltipProps {
  children: ReactNode
  content: string
  position?: "top" | "bottom" | "left" | "right"
  /** "click" = show on click; "hover" = show on mouse enter, hide on mouse leave */
  showOn?: "click" | "hover"
}

function ClickTooltip({
  children,
  content,
  position = "top",
  showOn = "click",
}: ClickTooltipProps) {
  const [open, setOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const triggerId = useId()
  const isHover = showOn === "hover"

  const toggleTooltip = () => setOpen((prev) => !prev)
  const close = () => setOpen(false)
  const openTooltip = () => setOpen(true)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open])

  return (
    <div
      ref={tooltipRef}
      className="click_tooltip_wrapper labelInfo"
      data-position={position}
      data-show-on={showOn}
      {...(isHover && {
        onMouseEnter: openTooltip,
        onMouseLeave: close,
      })}
    >
      <span
        id={triggerId}
        role={isHover ? undefined : "button"}
        tabIndex={isHover ? undefined : 0}
        aria-expanded={isHover ? undefined : open}
        aria-haspopup={isHover ? undefined : "true"}
        aria-describedby={open ? tooltipId : undefined}
        className="click_tooltip_trigger"
        onClick={isHover ? undefined : toggleTooltip}
        onKeyDown={
          isHover
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleTooltip()
                }
              }
        }
      >
        {children}
      </span>

      {open && (
        <div
          id={tooltipId}
          className="click_tooltip_bubble"
          role="tooltip"
          aria-live="polite"
        >
          <div className="click_tooltip_content">{content}</div>
        </div>
      )}
    </div>
  )
}

export default ClickTooltip
