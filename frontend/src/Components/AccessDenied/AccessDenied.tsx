import { Link } from "react-router-dom";
import "./accessdenied.css";
import { CircleAlert } from "lucide-react";

const AccessDenied = () => {
  return (
    <div className="page-not access-denied">
      <div>
        <CircleAlert color="tomato" size={60} />
        <div className="page_not_found">
          <h2>Access Denied</h2>
        </div>
        <p className="access-denied-message">
          You do not have permission to access this page.
        </p>
        <p className="goBack">
          Go back to <Link to="/dashboard" replace>Home</Link>
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
