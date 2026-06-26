import { useEffect, useState } from "react";
import { LayoutDashboard, Building2, ShoppingBag, Users, FileCheck } from "lucide-react";
import type { DashboardStats } from "./types";
import { BASE_URL } from "./utils";
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

  return (
    <div className="vendor_overview_page sec_user_page org_settings_page">
      <div className="vendor_overview_heading page_header_align">
        <div className="vendor_overview_headers page_header_row">
          <span className="icon_size_header" aria-hidden>
            <LayoutDashboard size={24} className="header_icon_svg" />
          </span>
          <div className="page_header_title_block">
            <h1 className="page_header_title">
              {viewOnly ? "Dashboard" : "System Admin Dashboard"}
            </h1>
            <p className="vendor_overview_subtitle page_header_subtitle">
              {viewOnly ? "View-only summary of platform metrics." : "Platform-wide metrics and activity summary."}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="vendor_overview_loading">Loading dashboard…</div>
      )}
      {error && (
        <div className="vendor_overview_error">{error}</div>
      )}
      {!loading && !error && stats && (
        <div>
          <div className="vendor_overview_metrics vendor_overview_metrics_four">
            <div className="vendor_overview_metric_card">
              <span className="vendor_overview_metric_card_icon" aria-hidden />
              <p className="vendor_overview_metric_title"><Building2 size={22} />Total Organizations</p>
              <p className="vendor_overview_metric_value">{stats.totalOrganizations}</p>
              <p className="vendor_overview_metric_desc">Registered organizations on the platform</p>
            </div>
            <div className="vendor_overview_metric_card">
              <span className="vendor_overview_metric_card_icon" aria-hidden />
              <p className="vendor_overview_metric_title"><ShoppingBag size={22} />Total Vendors</p>
              <p className="vendor_overview_metric_value">{stats.totalVendors}</p>
              <p className="vendor_overview_metric_desc">Vendors who completed onboarding</p>
            </div>
            <div className="vendor_overview_metric_card">
              <span className="vendor_overview_metric_card_icon" aria-hidden />
              <p className="vendor_overview_metric_title"><Users size={22} />Total Buyers</p>
              <p className="vendor_overview_metric_value">{stats.totalBuyers}</p>
              <p className="vendor_overview_metric_desc">Buyers who completed onboarding</p>
            </div>
            <div className="vendor_overview_metric_card">
              <span className="vendor_overview_metric_card_icon" aria-hidden />
              <p className="vendor_overview_metric_title"><FileCheck size={22} />Attestations</p>
              <p className="vendor_overview_metric_value">{stats.totalAttestations}</p>
              <p className="vendor_overview_metric_desc">Vendor self-attestations submitted</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminOverview;
