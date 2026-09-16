import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/layout/topNav.css";
import { Bell, Search } from "lucide-react";
import UserProfile from "../pages/UserProfile/UserProfile";
import AccountSettingsModal from "../pages/MyAccount/AccountSettingsModal";
import NotificationsPopover from "../UI/NotificationsPopover";
import {
  fetchAdminNotifications,
  isPlatformAdminSession,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
  type AdminNotificationsPayload,
} from "../../utils/adminNotificationsApi";

interface MeUser {
  email?: string | null;
  user_name?: string | null;
  user_first_name?: string | null;
  user_last_name?: string | null;
}

function getInitials(
  firstName: string,
  lastName: string,
  userName: string,
  email: string,
): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  const un = (userName ?? "").trim();
  if (un.length >= 2) return un.slice(0, 2).toUpperCase();
  if (un.length === 1) return un.toUpperCase();
  const em = (email ?? "").trim();
  if (em) return em.slice(0, 2).toUpperCase();
  return "UN";
}

/** Format stored role for UI display (e.g. "system admin" → "System Admin") */
function formatRoleForDisplay(role: string | null | undefined): string {
  if (role == null || typeof role !== "string" || !role.trim()) return "User";
  return role
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const TopNavBar = () => {
  const navigate = useNavigate();
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AdminNotificationsPayload>({
    items: [],
    unreadCount: 0,
  });

  const userRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifPopoverRef = useRef<HTMLDivElement>(null);

  const fetchMe = useCallback(async () => {
    const token = sessionStorage.getItem("bearerToken");
    if (!token) return;
    const baseUrl =
      import.meta.env.VITE_BASE_URL ?? "http://localhost:5003/api/v1";
    try {
      const res = await fetch(`${baseUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: MeUser = await res.json();
        setUser(data);
      } else {
        setUserFromSessionStorage();
      }
    } catch {
      setUserFromSessionStorage();
    }
  }, []);

  const setUserFromSessionStorage = useCallback(() => {
    const email = sessionStorage.getItem("userEmail") ?? "";
    const userName = sessionStorage.getItem("userName") ?? "";
    const firstName = sessionStorage.getItem("userFirstName") ?? "";
    const lastName = sessionStorage.getItem("userLastName") ?? "";
    if (email || userName || firstName || lastName) {
      setUser({
        email: email || null,
        user_name: userName || null,
        user_first_name: firstName || null,
        user_last_name: lastName || null,
      });
    }
  }, []);

  useEffect(() => {
    setUserFromSessionStorage();
    fetchMe();
  }, [fetchMe, setUserFromSessionStorage]);

  useEffect(() => {
    const onProfileUpdated = () => setUserFromSessionStorage();
    window.addEventListener("userProfileUpdated", onProfileUpdated);
    return () => window.removeEventListener("userProfileUpdated", onProfileUpdated);
  }, [setUserFromSessionStorage]);

  const loadNotifications = useCallback(async () => {
    const data = await fetchAdminNotifications();
    setNotifications(data);
  }, []);

  useEffect(() => {
    void loadNotifications();
    if (!isPlatformAdminSession()) return undefined;
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (isNotificationsVisible) void loadNotifications();
  }, [isNotificationsVisible, loadNotifications]);

  const initials = user
    ? getInitials(
        user.user_first_name ?? "",
        user.user_last_name ?? "",
        user.user_name ?? "",
        user.email ?? "",
      )
    : "UN";
  const displayName = user
    ? (user.user_name ?? "").trim() ||
      `${(user.user_first_name ?? "").trim()} ${(user.user_last_name ?? "").trim()}`.trim() ||
      (user.email ?? "").trim() ||
      "User"
    : (sessionStorage.getItem("userName") ?? "").trim() ||
      [
        sessionStorage.getItem("userFirstName"),
        sessionStorage.getItem("userLastName"),
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      (sessionStorage.getItem("userEmail") ?? "").trim() ||
      "User Name";
  const emailDisplay =
    (user?.email ?? "").trim() ||
    (sessionStorage.getItem("userEmail") ?? "").trim() ||
    "user@gmail.com";
  const systemRole = sessionStorage.getItem("systemRole");
  const userRole = sessionStorage.getItem("userRole");
  // For vendor/buyer show org role (e.g. Admin, Analyst) instead of user_platform_role (Vendor/Buyer)
  const isVendorOrBuyer =
    systemRole && ["vendor", "buyer"].includes(systemRole.trim().toLowerCase());
  const roleLabel =
    isVendorOrBuyer && userRole?.trim()
      ? formatRoleForDisplay(userRole)
      : formatRoleForDisplay(systemRole ?? undefined);

  const handleUserPopup = () => {
    setIsPopupVisible((prev) => !prev);
    if (isNotificationsVisible) setIsNotificationsVisible(false);
  };

  const handleNotificationsToggle = () => {
    setIsNotificationsVisible((prev) => !prev);
    if (isPopupVisible) setIsPopupVisible(false);
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const el = event.target as Element | null;
      /* Modals portaled to body — don't tear down the profile menu while they are open */
      if (el?.closest?.(".profile_modal_overlay")) {
        return;
      }
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        userRef.current &&
        !userRef.current.contains(target)
      ) {
        setIsPopupVisible(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(target) &&
        notifPopoverRef.current &&
        !notifPopoverRef.current.contains(target)
      ) {
        setIsNotificationsVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="top_nav_content">
        <div className="nav_left_spacer" aria-hidden />

        <form
          className="nav_search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Search size={18} className="nav_search_icon" aria-hidden />
          <input
            type="search"
            className="nav_search_input"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
            autoComplete="off"
          />
        </form>

        <div className="nav_right_content">
          {isPlatformAdminSession() ? (
            <div className="notifications_icon_sec" ref={notifRef}>
              <button
                type="button"
                className="notification_icon_btn"
                onClick={handleNotificationsToggle}
                aria-label={
                  notifications.unreadCount > 0
                    ? `Notifications, ${notifications.unreadCount} unread`
                    : "Notifications"
                }
                aria-expanded={isNotificationsVisible}
              >
                <Bell size={24} className="notification_icon" aria-hidden />
                {notifications.unreadCount > 0 ? (
                  <span className="notification_badge">
                    {notifications.unreadCount > 9
                      ? "9+"
                      : notifications.unreadCount}
                  </span>
                ) : null}
              </button>
              {isNotificationsVisible && (
                <div
                  className="notifications_popover_anchor"
                  ref={notifPopoverRef}
                >
                  <NotificationsPopover
                    items={notifications.items}
                    unreadCount={notifications.unreadCount}
                    onSelect={(item: AdminNotification) => {
                      if (item.readAt == null) {
                        void markAdminNotificationRead(item.id).then(() => {
                          void loadNotifications();
                        });
                      }
                      setIsNotificationsVisible(false);
                      if (item.type.startsWith("token_quota_exhausted")) {
                        navigate("/controls");
                      }
                    }}
                    onMarkAllRead={() => {
                      void markAllAdminNotificationsRead().then(() => {
                        void loadNotifications();
                      });
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}

          {/* USER SECTION */}
          <div
            className="user_icon_sec"
            onClick={handleUserPopup}
            ref={userRef}
          >
            <div className="initials">{initials}</div>
            <div className="name_email">
              <p className="userName">{displayName}</p>
              {/* {roleLabel && (
                <span className="user_role_badge" title={`Role: ${roleLabel}`}>
                  {roleLabel}
                </span>
              )} */}
              <p className="email_id" title={emailDisplay}>{emailDisplay}</p>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP */}
      {isPopupVisible && (
        <div ref={popupRef}>
          <UserProfile
            onClose={() => setIsPopupVisible(false)}
            onOpenSettings={() => {
              setIsPopupVisible(false);
              setIsSettingsOpen(true);
            }}
          />
        </div>
      )}

      {isSettingsOpen && (
        <AccountSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
};

export default TopNavBar;
