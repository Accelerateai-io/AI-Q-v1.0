// import React from "react";
import TopNavBar from "./TopNavBar";
import SideNavBar from "./SideNavBar";
import { Outlet } from "react-router-dom";
import "../../styles/layout/layout.css";
import "../../styles/card.css";

const MainLayout = () => {
  return (
    <div className="container">
      <div className="top_nav">
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
