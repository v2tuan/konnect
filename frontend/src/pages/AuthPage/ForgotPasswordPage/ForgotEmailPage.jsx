import { GalleryVerticalEnd } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { forgotPasswordAPI } from "@/redux/user/userSlice";

export default function ForgotEmailPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: { email: "" }
    });

    const onSendOtp = async ({ email }) => {
        await toast
            .promise(dispatch(forgotPasswordAPI({ email })), { pending: "Sending OTP..." })
            .then((res) => {
                if (!res.error) {
                    navigate(`/auth/forgot/otp?email=${encodeURIComponent(email)}`, { state: { email } });
                }
            });
    };

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link to="/" className="flex items-center gap-2 font-medium">
                        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                            <GalleryVerticalEnd className="size-4" />
                        </div>
                        Konnect.
                    </Link>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <form className={cn("flex flex-col gap-6")} onSubmit={handleSubmit(onSendOtp)}>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">Forgot password</h1>
                                <p className="text-muted-foreground text-sm text-balance">
                                    Enter your email to receive a one-time code (OTP).
                                </p>
                            </div>

                            <div className="grid gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        aria-invalid={!!errors.email}
                                        {...register("email", {
                                            required: "Email is required",
                                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" }
                                        })}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email.message}</p>
                                    )}
                                </div>

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? "Please wait..." : "Send OTP"}
                                </Button>
                            </div>

                            <div className="text-center text-sm">
                                Remembered your password?{" "}
                                <Link to="/login" className="underline underline-offset-4">
                                    Back to login
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div className="bg-muted relative hidden lg:block">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                >
                    <source src="/intro.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    );
}
