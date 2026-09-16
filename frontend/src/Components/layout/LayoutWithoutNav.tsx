import { Outlet } from "react-router-dom";
import "../../styles/layout/layout.css";
import onboardingLogoBlue from "../../assets/images/mainLogo/new_logo/ai_q_logo_blue.png";
import onboardingLogoGray from "../../assets/images/mainLogo/new_logo/ai_q_logo_gray.png";

const LayoutWithoutNav = () => {
  return (
    <>
      {/* <div className="container onBoarding_container">
         <div className="step_form_header welcome_msg_onboarding">
           <div className="logo_sec">
            <img src={onboardingLogoBlue} alt="" className="onboarding-header-logo" width={40} height={40} />
          </div>
          <h2>Welcome to AI-Q!</h2>
          <p className="modal_sub_title">Let's set up your account in just few steps</p>
        </div>
        <main className="main_container">
          <Outlet />
        </main>
      </div> */}
      <div className="layout_onBoarrding">
        <header className="header_onboarding">
          <div className="logo_sec header_for_auth" aria-label="AI-Q Platform">
            <span className="onboarding-header-logo_wrap">
              <img
                src={onboardingLogoBlue}
                alt="AI-Q"
                className="onboarding-header-logo onboarding-header-logo--light"
                width={56}
                height={56}
              />
              <img
                src={onboardingLogoGray}
                alt=""
                className="onboarding-header-logo onboarding-header-logo--dark"
                width={56}
                height={56}
                aria-hidden
              />
            </span>
            <p>AI-Q Platform</p>
          </div>
          <h2>Welcome to AI-Q!</h2>
          <p className="modal_sub_title">
            Let&apos;s set up your account in just a few steps
          </p>
        </header>

        <div className="container_onBoarding">
          <main className="main_onBoarding">
            <section>
              <Outlet />
            </section>
          </main>
        </div>
      </div>
    </>
  );
};

export default LayoutWithoutNav;
