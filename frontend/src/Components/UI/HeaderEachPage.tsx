

const HeaderEachPage = ({icon, main_text, sub_text}) => {
  return (
    <>
      <div className="vendor_overview_page sec_user_page org_settings_page">
        <div className="vendor_directory_header page_header_align">
          <div className="page_header_row">
            <span className="header_icon_svg">
            {icon}
            </span>
            <div className="page_header_title_block">
              <h1 className="page_header_title">{main_text}</h1>
              <p className="vendor_directory_subtitle page_header_subtitle">
               {sub_text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderEachPage;
