
import React, { useState } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { CloudUpload, IdCard, Mail, Phone, Calendar as CalendarIcon } from "lucide-react"

function formatDate(date) {
  if (!date) return ""
  try {
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  } catch {
    return ""
  }
}

function VisuallyHiddenInput(props) {
  return <input className="sr-only" {...props} />
}

export default function AccountTab() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)

  const defaultDOB = currentUser?.dateOfBirth ? new Date(currentUser.dateOfBirth) : null

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm({
    defaultValues: {
      fullName: currentUser?.fullName || "",
      bio: currentUser?.bio || "",
      dateOfBirth: defaultDOB // Date | null
    }
  })

  // Xem giá trị date để render vào Input
  const dateValue = useWatch({ control, name: "dateOfBirth" })

  // Avatar upload
  const uploadAvatar = (e) => {
    const file = e.target?.files?.[0]
    const error = singleFileValidator(file)
    if (error) {
      toast.error(error)
      e.target.value = ""
      return
    }
    const reqData = new FormData()
    reqData.append("avatarUrl", file)

    toast
      .promise(dispatch(updateUserAPI(reqData)), { pending: "Updating..." })
      .then((res) => {
        if (!res.error) toast.success("Avatar updated successfully!")
        e.target.value = ""
      })
  }

  // Submit profile info (bao gồm dateOfBirth)
  const submitChangeInformation = (data) => {
    const payload = {
      fullName: data.fullName?.trim(),
      bio: data.bio ?? "",
      // Gửi ISO string hoặc null
      dateOfBirth: data.dateOfBirth instanceof Date && !isNaN(data.dateOfBirth)
        ? data.dateOfBirth.toISOString()
        : null
    }

    toast
      .promise(dispatch(updateUserAPI(payload)), { pending: "Updating..." })
      .then((res) => {
        if (!res.error) toast.success("User updated successfully!")
      })
  }

  // Popover Calendar
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(defaultDOB || new Date())

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

            <div className="text-lg font-semibold mb-10">
              {currentUser?.fullName}
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

              {/* Date of Birth (Input hiển thị + Calendar) */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="dob" className="px-1">Date of Birth</Label>
                <Controller
                  control={control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        id="dob"
                        value={formatDate(dateValue)}
                        placeholder="June 01, 2025"
                        className="bg-background pr-10"
                        readOnly
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault()
                            setOpen(true)
                          }
                        }}
                      />
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-picker"
                            variant="ghost"
                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                            type="button"
                          >
                            <CalendarIcon className="size-3.5" />
                            <span className="sr-only">Select date</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="end"
                          alignOffset={-8}
                          sideOffset={10}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            captionLayout="dropdown"
                            month={month}
                            onMonthChange={setMonth}
                            onSelect={(d) => {
                              field.onChange(d)
                              setOpen(false)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                />
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
