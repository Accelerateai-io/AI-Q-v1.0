// src/components/Toaster.tsx
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Toaster.css";

const Toaster = () => {
  return (
    <ToastContainer
      className="app-toast-container"
      position="top-right"
      autoClose={2000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      theme="colored"
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
  );
};

export default Toaster;
