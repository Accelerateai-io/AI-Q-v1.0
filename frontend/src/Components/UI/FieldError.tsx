import { AlertCircle } from "lucide-react"

interface FieldErrorProps {
  message: string
}

function FieldError({ message }: FieldErrorProps) {
  return (
    <p className="vendor_field_error" role="alert">
      <AlertCircle size={14} aria-hidden />
      <span>{message}</span>
    </p>
  )
}

export default FieldError
