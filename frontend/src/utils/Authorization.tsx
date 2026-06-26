// Components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";

const Authorization = () => {
  const isAuthenticated = () => {
    return !!sessionStorage.getItem("bearerToken");
  };

  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

export default Authorization;
