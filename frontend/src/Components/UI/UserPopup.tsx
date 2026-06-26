import React from 'react'

type UserPopupTypes = {
    children ?: React.ReactNode;

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