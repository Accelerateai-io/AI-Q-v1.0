import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { CloseButtonProps, IconProps, Theme } from "react-toastify";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Toaster.css";

function ToastIcon({ type }: IconProps) {
  const size = 16;
  const stroke = 2.25;

  switch (type) {
    case "success":
      return <CheckCircle2 size={size} strokeWidth={stroke} aria-hidden />;
    case "error":
      return <CircleAlert size={size} strokeWidth={stroke} aria-hidden />;
    case "warning":
      return <TriangleAlert size={size} strokeWidth={stroke} aria-hidden />;
    case "info":
      return <Info size={size} strokeWidth={stroke} aria-hidden />;
    default:
      return <Info size={size} strokeWidth={stroke} aria-hidden />;
  }
}

function ToastCloseButton({ closeToast, theme, ariaLabel }: CloseButtonProps) {
  return (
    <button
      type="button"
      className={`Toastify__close-button Toastify__close-button--${theme} app-toast-close`}
      onClick={(e) => {
        e.stopPropagation();
        closeToast(true);
      }}
      aria-label={ariaLabel ?? "Close notification"}
    >
      <X size={15} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

function getResolvedToastTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

const Toaster = () => {
  const [theme, setTheme] = useState<Theme>(() => getResolvedToastTheme());

  useEffect(() => {
    const sync = () => setTheme(getResolvedToastTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <ToastContainer
      className="app-toast-container"
      toastClassName="app-toast"
      position="top-right"
      autoClose={2800}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      theme={theme}
      transition={Slide}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      icon={ToastIcon}
      closeButton={ToastCloseButton}
    />
  );
};

export default Toaster;
