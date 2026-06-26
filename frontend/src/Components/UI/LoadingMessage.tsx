import { Loader2 } from "lucide-react"
import "./LoadingMessage.css"

interface LoadingMessageProps {
  message?: string
  className?: string
}

/**
 * Simple loading indicator: spinner + message. Use for table/data loading states.
 */
function LoadingMessage({ message = "Loading…", className = "" }: LoadingMessageProps) {
  return (
    <div className={`loading_message_wrapper ${className}`.trim()}>
      <div className="loading_message" role="status" aria-live="polite">
        <Loader2 className="loading_message_icon" size={24} aria-hidden />
        <p className="loading_message_text">{message}</p>
      </div>
    </div>
  )
}

export default LoadingMessage
