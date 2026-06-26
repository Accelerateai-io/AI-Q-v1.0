import { FileText } from "lucide-react";
import type { ReactNode } from "react";

type HeaderProps = {
  title_vendor: string;
  sub_title_vendor?: string;
  className?: string;
  icon?: ReactNode;
};

const DEFAULT_HEADER_ICON = <FileText size={18} aria-hidden />;

const HeaderForBuyer = ({
  title_vendor,
  sub_title_vendor,
  className,
  icon,
}: HeaderProps) => {
  return (
     <div className={className}>
      <div className="header_title_vendor">
        <div className="headers_icons">
          <span
            className="icon_size_header header_icon_svg"
            aria-hidden="true"
            // style={ICON_WRAPPER_STYLE}
          >
            {icon ?? DEFAULT_HEADER_ICON}
          </span>
        </div>
        <div className="headers_title_sections">
          <p>{title_vendor}</p>
          <p className="sub_title_card">{sub_title_vendor}</p>
        </div>
      </div>
    </div>
    // <div className={className}>
    //   <div className="header_title_vendor">
    //     <span
    //       className="icon_size_header"
    //       aria-hidden="true"
    //       style={{
    //         width: 18,
    //         height: 18,
    //         minWidth: 18,
    //         minHeight: 18,
    //         display: "inline-flex",
    //         alignItems: "center",
    //         justifyContent: "center",
    //         flexShrink: 0,
    //         color: "inherit",
    //       }}
    //     >
    //       {icon ?? DEFAULT_HEADER_ICON}
    //     </span>
    //     <p>{title_vendor}</p>
    //   </div>
    //   <p className="sub_title_card">{sub_title_vendor}</p>
    // </div>
  );
};

export default HeaderForBuyer;
