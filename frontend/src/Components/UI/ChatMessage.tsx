import type { ReactNode } from "react";
import "./ChatMessage.css";

export interface ChatMessageProps {
  /** "agent" | "user" */
  role: "agent" | "user";
  /** Optional icon (e.g. bot icon for agent) */
  icon?: ReactNode;
  /** Title shown next to icon (e.g. "AI Sales Assistant") */
  title?: string;
  /** Subtitle or caption (e.g. "Powered by vendor attestations & risk data.") */
  subtitle?: string;
  /** Message body */
  children: ReactNode;
  className?: string;
}

function ChatMessage({
  role,
  icon,
  title,
  subtitle,
  children,
  className = "",
}: ChatMessageProps) {
  const isAgent = role === "agent";
  const isUserWithIcon = role === "user" && icon;

  return (
    <div
      className={`chat_message chat_message--${role} ${className}`}
      data-role={role}
    >
      {isAgent && (icon || title || subtitle) && (
        <>
          <div className="chat_message_header">
            {icon && <span className="chat_message_icon">{icon}</span>}
            <div>
              {title && <span className="chat_message_title">{title}</span>}
              {subtitle && <p className="chat_message_subtitle">{subtitle}</p>}
            </div>
          </div>
        </>
      )}
      {isUserWithIcon ? (
        <div className="chat_message_user_row">
          <span className="chat_message_icon chat_message_icon--user">
            {icon}
          </span>
          <div className="chat_message_body">{children}</div>
        </div>
      ) : (
        <div className="chat_message_body">{children}</div>
      )}
    </div>
  );
}

export default ChatMessage;
