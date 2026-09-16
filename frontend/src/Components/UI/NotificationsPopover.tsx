import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import "../../styles/popovers.css";
import type { AdminNotification } from "../../utils/adminNotificationsApi";

const FEATURE_LABELS: Record<string, string> = {
  attestation: "Attestation",
  assessment: "Assessment",
  sales_agent: "Sales agent",
  reports: "Reports",
};

interface NotificationsPopoverProps {
  /** Message when there are no notifications. Default: "You're all caught up" */
  emptyMessage?: string;
  /** Optional class for the wrapper */
  className?: string;
  items?: AdminNotification[];
  unreadCount?: number;
  onSelect?: (item: AdminNotification) => void;
  onMarkAllRead?: () => void;
  /** Optional custom content instead of empty state */
  children?: ReactNode;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (deltaSec < 60) return "Just now";
  const mins = Math.round(deltaSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

function quotaFeatureLabel(type: string): string | null {
  if (!type.startsWith("token_quota_exhausted")) return null;
  const key = type.includes(":") ? type.slice(type.indexOf(":") + 1) : "";
  if (!key) return null;
  return FEATURE_LABELS[key] ?? key.replace(/_/g, " ");
}

function displayName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return null;
  return trimmed;
}

function itemCopy(item: AdminNotification): {
  title: string;
  subtitle: string | null;
  usage: string | null;
  body: string | null;
} {
  const isQuota = item.type.startsWith("token_quota_exhausted");
  if (!isQuota) {
    return {
      title: item.title,
      subtitle: null,
      usage: null,
      body: item.body,
    };
  }

  const parts = [
    displayName(item.subjectUserName),
    displayName(item.organizationName),
    quotaFeatureLabel(item.type),
  ].filter(Boolean);

  const usage =
    item.allocatedTokens > 0
      ? `${formatCount(item.consumedTokens)} / ${formatCount(item.allocatedTokens)} tokens used`
      : null;

  return {
    title: "Token quota exhausted",
    subtitle: parts.length ? parts.join(" · ") : null,
    usage,
    body: null,
  };
}

/** Reusable notifications dropdown content. Use emptyMessage for empty state or pass children for a list. */
function NotificationsPopover({
  emptyMessage = "You're all caught up",
  className = "",
  items,
  unreadCount = 0,
  onSelect,
  onMarkAllRead,
  children,
}: NotificationsPopoverProps) {
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <div className={`popover_panel notifications_popover ${className}`.trim()}>
      {children != null ? (
        children
      ) : (
        <>
          <div className="notifications_popover_head">
            <p className="notifications_popover_title">Notifications</p>
            {unreadCount > 0 && onMarkAllRead ? (
              <button
                type="button"
                className="notifications_popover_markAll"
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkAllRead();
                }}
              >
                Mark all as read
              </button>
            ) : null}
          </div>
          {hasItems ? (
            <ul className="notifications_popover_list">
              {items.map((item) => {
                const unread = item.readAt == null;
                const copy = itemCopy(item);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`notifications_popover_item ${
                        unread ? "notifications_popover_item--unread" : ""
                      }`}
                      onClick={() => onSelect?.(item)}
                    >
                      <span
                        className="notifications_popover_dot"
                        aria-hidden
                      />
                      <span className="notifications_popover_itemMain">
                        <span className="notifications_popover_itemTop">
                          <span className="notifications_popover_itemTitle">
                            {copy.title}
                          </span>
                          <span className="notifications_popover_itemMeta">
                            {relativeTime(item.createdAt)}
                          </span>
                        </span>
                        {copy.subtitle ? (
                          <span className="notifications_popover_itemSub">
                            {copy.subtitle}
                          </span>
                        ) : null}
                        {copy.usage ? (
                          <span className="notifications_popover_itemUsage">
                            {copy.usage}
                          </span>
                        ) : null}
                        {copy.body ? (
                          <span className="notifications_popover_itemBody">
                            {copy.body}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="notifications_popover_empty">
              <Bell
                size={22}
                className="notifications_popover_icon"
                aria-hidden
              />
              <p className="notifications_popover_message">{emptyMessage}</p>
              <p className="notifications_popover_emptyHint">
                Quota alerts will show up here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationsPopover;
