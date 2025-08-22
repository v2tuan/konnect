import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { GalleryVerticalEnd } from "lucide-react"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OtpPage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader className="flex flex-col items-center text-center">
                    <div className="flex justify-center gap-2 md:justify-start mb-4">
                        <a href="/" className="flex items-center gap-2 font-medium">
                            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                                <GalleryVerticalEnd className="size-4" />
                            </div>
                            Konnect.
                        </a>
                    </div>
                    <CardTitle className="text-2xl mb-1">Verify account</CardTitle>
                    <CardDescription>
                        Enter the verification code sent to your email
                    </CardDescription>
                </CardHeader>
                <CardContent className="w-full max-w-sm flex items-center justify-center">
                    <form>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <InputOTP maxLength={6}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup>
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup>
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <div className="text-center text-sm">
                                Didn&apos;t Receive the code?{" "}
                                <a href="#" className="underline underline-offset-4">
                                    Resend
                                </a>
                            </div>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" className="w-full">
                        Verify
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
