
const Button = ({children, ...props}) => {
  const {disabled, className, onClick, type} = props;
  // console.log(props);
  // console.log(disabled);
  return (
   <>
   <button disabled={disabled} className={`${className} ${disabled ? "disabled_css":" "} `} type={type} onClick={onClick}>{children}</button>
   </>
  )
}

export default Button