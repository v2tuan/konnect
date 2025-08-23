import { useState } from "react"
import { useDispatch } from "react-redux"
import { useForm } from "react-hook-form"
import { toast } from "react-toastify"
import { logoutUserAPI, updateUserAPI } from "~/redux/user/userSlice"
import FieldErrorAlert from "~/components/common/Form/FieldErrorAlert"
import { FIELD_REQUIRED_MESSAGE, PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from "~/utils/validators"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"

import { KeyRound, Lock, LockKeyhole, LogOut } from "lucide-react"

export default function SecurityTab() {
  const dispatch = useDispatch()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const onSubmit = (data) => {
    setPendingData(data)
    setConfirmOpen(true)
  }

  const confirmChangePassword = () => {
    if (!pendingData) return
    const { current_password, new_password } = pendingData

    toast
      .promise(dispatch(updateUserAPI({ current_password, new_password })), { pending: "Updating..." })
      .then((res) => {
        if (!res.error) {
          toast.success("Successfully changed your password. Please login again.")
          dispatch(logoutUserAPI(false))
        }
      })
      .finally(() => {
        setConfirmOpen(false)
        setPendingData(null)
      })
  }

  return (
    <>
      <div className="w-full grid place-items-center">
        <Card className="w-full max-w-[1200px] border-none shadow-none py-20">
          <CardContent className="px-0 pt-0">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Security Dashboard</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="w-[400px] max-w-full flex flex-col gap-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="password"
                      {...register("current_password", {
                        required: FIELD_REQUIRED_MESSAGE,
                        pattern: { value: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE }
                      })}
                    />
                  </div>
                  <FieldErrorAlert errors={errors} fieldName={"current_password"} />
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="password"
                      {...register("new_password", {
                        required: FIELD_REQUIRED_MESSAGE,
                        pattern: { value: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE }
                      })}
                    />
                  </div>
                  <FieldErrorAlert errors={errors} fieldName={"new_password"} />
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <Label>New Password Confirmation</Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="password"
                      {...register("new_password_confirmation", {
                        validate: (value) => {
                          if (value === watch("new_password")) return true
                          return "Password confirmation does not match."
                        }
                      })}
                    />
                  </div>
                  <FieldErrorAlert errors={errors} fieldName={"new_password_confirmation"} />
                </div>

                <Button type="submit" className="h-11 interceptor-loading cursor-pointer">Change</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Confirm dialog (shadcn AlertDialog) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-amber-600" />
              Change Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have to login again after successfully changing your password. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangePassword}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
