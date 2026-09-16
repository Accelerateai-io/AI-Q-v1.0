import React from 'react'

type UserPopupTypes = {
    children?: React.ReactNode;
    className?: string;
}
const UserPopup = ({children, ...props} : UserPopupTypes) => {
  return (
    <>
    
    <div {...props}>
        {children}
    </div>
    </>
  )
}

export default UserPopup