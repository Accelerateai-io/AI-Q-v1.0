import { Loader2 } from "lucide-react"
import "./LoadingMessage.css"

interface LoadingMessageProps {
  message?: string
  className?: string
  /** Smaller min-height for modals / nested panels */
  compact?: boolean
}

/**
 * Platform loading indicator: spinner + message.
 * Use for page, table, section, and modal data-loading states.
 */
function LoadingMessage({
  message = "Loading…",
  className = "",
  compact = false,
}: LoadingMessageProps) {
  return (
    <div
      className={`loading_message_wrapper${compact ? " loading_message_wrapper--compact" : ""} ${className}`.trim()}
    >
      <div className="loading_message" role="status" aria-live="polite">
        <Loader2 className="loading_message_icon" size={24} aria-hidden />
        <p className="loading_message_text">{message}</p>
      </div>
    </div>
  )
}

export default LoadingMessage
