import { useEffect, useState } from "react";
import { Building2, LayoutDashboard, ShoppingBag, Users, FileCheck } from "lucide-react";
import type { DashboardStats } from "./types";
import { BASE_URL } from "./utils";
import DashboardFeatureCard from "../../UI/DashboardFeatureCard";
import LoadingMessage from "../../UI/LoadingMessage";
import "./dashboard.css";

interface SystemAdminOverviewProps {
  /** When true, show as view-only dashboard (e.g. for AI Directory Curator). */
  viewOnly?: boolean;
}

const SystemAdminOverview = ({ viewOnly = false }: SystemAdminOverviewProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LOADER_MIN_MS = 2000;

  useEffect(() => {
    const token = sessionStorage.getItem("bearerToken");
    if (!token) {
      setError("Please log in to view dashboard.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const loadStart = Date.now();
    const finishLoading = () => {
      const remaining = Math.max(0, LOADER_MIN_MS - (Date.now() - loadStart));
      setTimeout(() => setLoading(false), remaining);
    };
    fetch(`${BASE_URL}/dashboardStats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.data) {
          setStats(result.data);
        } else {
          setError(result?.message ?? "Failed to load dashboard stats");
        }
      })
      .catch(() => setError("Network or server error"))
      .finally(() => finishLoading());
  }, []);

  if (loading) {
    return (
      <div className="vendor_overview_page sec_user_page org_settings_page admin_overview_page">
        <LoadingMessage
          message="Loading dashboard…"
          className="loading_message_wrapper--page"
        />
      </div>
    );
  }

  return (
    <div className="vendor_overview_page sec_user_page org_settings_page admin_overview_page">
      <header className="dash_greeting_row dash_greeting_row--page_header admin_overview_header">
        <div className="page_header_row">
          <span className="icon_size_header" aria-hidden>
            <LayoutDashboard size={32} className="header_icon_svg" />
          </span>
          <div className="page_header_title_block">
            <h1 className="dash_greeting_title page_header_title">
              {viewOnly ? "Dashboard" : "System Admin Dashboard"}
            </h1>
            <p className="dash_greeting_subtitle page_header_subtitle">
              {viewOnly
                ? "View-only summary of platform metrics."
                : "Platform-wide metrics and activity summary."}
            </p>
          </div>
        </div>
      </header>

      <div className="admin_overview_content">
        {error && <div className="vendor_overview_error">{error}</div>}
        {!error && stats && (
          <div
            className="dash_feature_grid dash_feature_grid--admin"
            aria-label="Platform metrics"
          >
            <DashboardFeatureCard
              to="/organizations"
              accent="teal"
              title="Organizations"
              description="Registered organizations on the platform."
              icon={<Building2 size={22} strokeWidth={1.75} />}
              footerLabel={`${stats.totalOrganizations} total`}
            />
            <DashboardFeatureCard
              to="/organizations"
              accent="orange"
              title="Vendors"
              description="Vendors who completed onboarding."
              icon={<ShoppingBag size={22} strokeWidth={1.75} />}
              footerLabel={`${stats.totalVendors} live`}
            />
            <DashboardFeatureCard
              to="/organizations"
              accent="rose"
              title="Buyers"
              description="Buyers who completed onboarding."
              icon={<Users size={22} strokeWidth={1.75} />}
              footerLabel={`${stats.totalBuyers} live`}
            />
            <DashboardFeatureCard
              to="/attestation_details"
              accent="sky"
              title="Attestations"
              description="Vendor self-attestations submitted across the platform."
              icon={<FileCheck size={22} strokeWidth={1.75} />}
              footerLabel={`${stats.totalAttestations} total`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAdminOverview;
