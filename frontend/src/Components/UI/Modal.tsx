import React from "react"
import "../../styles/modal/modal.css"

interface ModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose?: () => void
  modalPopupClassName?: string
  overlayClassName?: string
  /** When set, used instead of "modal_popup" for the inner wrapper (pass "" to omit modal_popup). */
  popupClassName?: string
}

function Modal({ children, isOpen, onClose, modalPopupClassName, overlayClassName, popupClassName }: ModalProps) {
  if (!isOpen) return null
  const innerClass = [popupClassName !== undefined ? popupClassName : "modal_popup", modalPopupClassName].filter(Boolean).join(" ").trim() || undefined
  return (
    <div
      className={overlayClassName ?? "modal_overlay"}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={innerClass || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal_content">{children}</div>
      </div>
    </div>
  )
}

export default Modal