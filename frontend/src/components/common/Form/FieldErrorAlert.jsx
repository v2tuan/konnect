import { Alert, AlertDescription } from "@/components/ui/alert"
import { CircleAlert } from "lucide-react"

function FieldErrorAlert({ errors, fieldName }) {
  if (!errors || !errors[fieldName]) return null
  return (
    <Alert variant="destructive" className="mt-2 overflow-hidden">
      <CircleAlert className="h-4 w-4" />
      <AlertDescription>{errors[fieldName]?.message}</AlertDescription>
    </Alert>
  )
}

export default FieldErrorAlert
