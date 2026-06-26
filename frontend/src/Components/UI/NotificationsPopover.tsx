import { Bell } from "lucide-react";
import "../../styles/popovers.css";

interface NotificationsPopoverProps {
  /** Message when there are no notifications. Default: "No notifications" */
  emptyMessage?: string;
  /** Optional class for the wrapper */
  className?: string;
  /** Optional custom content instead of empty state */
  children?: React.ReactNode;
}

/** Reusable notifications dropdown content. Use emptyMessage for empty state or pass children for a list. */
function NotificationsPopover({
  emptyMessage = "No notifications",
  className = "",
  children,
}: NotificationsPopoverProps) {
  return (
    <div className={`popover_panel notifications_popover ${className}`.trim()}>
      {children != null ? (
        children
      ) : (
        <>
          <Bell size={28} className="notifications_popover_icon" aria-hidden />
          <p className="notifications_popover_message">{emptyMessage}</p>
        </>
      )}
    </div>
  );
}

export default NotificationsPopover;
