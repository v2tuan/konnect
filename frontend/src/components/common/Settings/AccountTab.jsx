/* eslint-disable no-console */
import { useForm } from "react-hook-form"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-toastify"
import FieldErrorAlert from "~/components/common/Form/FieldErrorAlert"
import { selectCurrentUser, updateUserAPI } from "~/redux/user/userSlice"
import { FIELD_REQUIRED_MESSAGE, singleFileValidator } from "~/utils/validators"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { CloudUpload, IdCard, Mail, Phone } from "lucide-react"

function VisuallyHiddenInput(props) {
  return <input className="sr-only" {...props} />
}

export default function AccountTab() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)

  // Map đúng field trong DB
  const initialForm = {
    fullName: currentUser?.fullName || "",
    bio: currentUser?.bio || ""
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ defaultValues: initialForm })

  const submitChangeInformation = (data) => {
    toast
      .promise(dispatch(updateUserAPI(data)), { pending: "Updating..." })
      .then((res) => {
        if (!res.error) toast.success("User updated successfully!")
      })
  }

  const uploadAvatar = (e) => {
    const file = e.target?.files?.[0]
    const error = singleFileValidator(file)
    if (error) {
      toast.error(error)
      e.target.value = ""
      return
    }
    const reqData = new FormData()
    reqData.append("avatar", file)

    toast
      .promise(dispatch(updateUserAPI(reqData)), { pending: "Updating..." })
      .then((res) => {
        if (!res.error) toast.success("Avatar updated successfully!")
        e.target.value = ""
      })
  }

  return (
    <div className="w-full grid place-items-center">
      <Card className="w-full max-w-[1200px] border-none shadow-none pb-20">
        <CardContent className="px-0 pt-0">
          {/* Header: Avatar + Info */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20 mb-2">
                <AvatarImage alt={currentUser?.fullName} src={currentUser?.avatarUrl} />
                <AvatarFallback>
                  {currentUser?.fullName?.slice(0, 2)?.toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="sm" className="gap-2">
                      <label>
                        <CloudUpload className="h-4 w-4" />
                        Upload
                        <VisuallyHiddenInput type="file" onChange={uploadAvatar} />
                      </label>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload a new image to update your avatar immediately.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-lg font-semibold mb-10">{currentUser?.fullName}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(submitChangeInformation)} className="mt-6">
            <div className="w-[400px] max-w-full flex flex-col gap-4">
              {/* Email (disabled) */}
              <div className="space-y-1.5">
                <Label>Your Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input disabled defaultValue={currentUser?.email} className="pl-9" type="text" />
                </div>
              </div>

              {/* Phone (disabled) */}
              <div className="space-y-1.5">
                <Label>Your Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input disabled defaultValue={currentUser?.phone} className="pl-9" type="text" />
                </div>
              </div>

              {/* Full Name (editable) */}
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    type="text"
                    {...register("fullName", { required: FIELD_REQUIRED_MESSAGE })}
                  />
                </div>
                <FieldErrorAlert errors={errors} fieldName={"fullName"} />
              </div>

              {/* Bio (editable) */}
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Input type="text" {...register("bio")} />
              </div>

              <Button type="submit" className="h-11 interceptor-loading cursor-pointer">
                Update
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
