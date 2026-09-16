import type { ReactNode } from "react";
import "./Login/login.css";
import signinLogoBlue from "../../assets/images/mainLogo/new_logo/ai_q_logo_blue.png";
import signinLogoGray from "../../assets/images/mainLogo/new_logo/ai_q_logo_gray.png";
import poweredByLogo from "../../assets/poweredby/Poweredby.svg";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Wide card for multi-column forms (e.g. sign up) */
  variant?: "default" | "wide";
  /** Product name shown under the logo above the card */
  brandName?: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  variant = "default",
  brandName = "AI-Q Platform",
}: AuthShellProps) {
  const isWide = variant === "wide";

  return (
    <div className="authPage authPage--signin authPage--minimal">
      <div
        className={`authContent authContent--signin ${isWide ? "authContent--signin-wide" : ""}`}
      >
        <div className="signin-lockup">
          <span className="signin-lockup__logo_wrap">
            <img
              src={signinLogoBlue}
              alt=""
              className="signin-lockup__logo signin-lockup__logo--light"
              width={72}
              height={72}
              aria-hidden
            />
            <img
              src={signinLogoGray}
              alt=""
              className="signin-lockup__logo signin-lockup__logo--dark"
              width={72}
              height={72}
              aria-hidden
            />
          </span>
          <span className="signin-lockup__name">{brandName}</span>
        </div>
        <div className="loginData loginData--signin">
          <div className="loginCred loginCred--signin">
            <div
              className={`loginForm loginForm--signin ${isWide ? "loginForm--signin-wide" : ""}`}
            >
              <div className="signin-heading-block">
                <h1 className="signin-title">{title}</h1>
                {subtitle ? (
                  <p className="signin-subtitle">{subtitle}</p>
                ) : null}
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className="signin-poweredby">
        <a
          href="https://www.cortexsce.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="signin-poweredby__link"
        >
          <img
            src={poweredByLogo}
            alt="Powered by Cortexsce"
            className="signin-poweredby__img"
            width={140}
            height={30}
          />
        </a>
      </div>
    </div>
  );
}
