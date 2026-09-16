// import React from "react";
import { useEffect, useState } from "react";
import TopNavBar from "./TopNavBar";
import SideNavBar from "./SideNavBar";
import { Outlet, useLocation } from "react-router-dom";
import "../../styles/layout/layout.css";
import "../../styles/card.css";
import { fetchLlmModelConfig } from "../../utils/llmModelApi";

function isSystemAdminRole(): boolean {
  const systemRole = (sessionStorage.getItem("systemRole") ?? "")
    .toLowerCase()
    .trim()
    .replace(/_/g, " ");
  return systemRole === "system admin";
}

const MainLayout = () => {
  const location = useLocation();
  const [navScrolled, setNavScrolled] = useState(false);

  // Prime active LLM store so Controls → Apply updates are visible app-wide without refresh.
  useEffect(() => {
    if (!isSystemAdminRole()) return;
    if (!sessionStorage.getItem("bearerToken")) return;
    void fetchLlmModelConfig();
  }, []);

  // Keep main pane at top on navigation so short loading pages don’t show leftover scroll gap.
  useEffect(() => {
    const main = document.querySelector(".main_container");
    if (main instanceof HTMLElement) main.scrollTop = 0;
    setNavScrolled(false);
  }, [location.pathname]);

  // Frosted blur state while main content scrolls under the fixed top nav.
  useEffect(() => {
    const main = document.querySelector(".main_container");
    if (!(main instanceof HTMLElement)) return;

    const onScroll = () => {
      setNavScrolled(main.scrollTop > 4);
    };

    onScroll();
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  return (
    <div className="container">
      <div className={`top_nav${navScrolled ? " top_nav--scrolled" : ""}`}>
        <TopNavBar />
      </div>

      <div className="wrapper">
        <div className="side_nav">
          <SideNavBar />
        </div>

        <main className="main_container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
