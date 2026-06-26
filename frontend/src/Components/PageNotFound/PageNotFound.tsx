// import React from "react";
import { useNavigate } from "react-router-dom";
import "./pagenotfound.css";
import PageNotFoundImg from "../../assets/pageNotFound.svg";

const PageNotFound = () => {
  const navigate = useNavigate();

  const handleHomeClick = () => {
    const isLoggedIn = !!sessionStorage.getItem("bearerToken");
    if (isLoggedIn) {
      navigate("/dashboard", { replace: true });
    } else {
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="page-not">
      <div>
        <div className="image_sections">
          <img src={PageNotFoundImg} alt="" />
        </div>
        <div className="page_not_found">
          <h2>404 Error - Page Not Found</h2>
        </div>
        <p className="goBack">
          Go back to{" "}
          <button type="button" className="page-not-home-link" onClick={handleHomeClick}>
            Home
          </button>
        </p>
      </div>
    </div>
  );
};

export default PageNotFound;
