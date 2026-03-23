"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMutation } from "@tanstack/react-query"
import { userAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { getInitials } from "@/lib/utils"
import type { User } from "@/types/user"

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileUser extends User {
  phone?: string
  bio?: string
}

interface UpdateProfileResponse {
  data?: {
    user?: Partial<ProfileUser>
    avatarUrl?: string
    devOtp?: string
  }
}

interface ErrorWithMessage {
  message?: string
  response?: {
    data?: {
      message?: string
    }
  }
}

export function ProfileSettings() {
  const { user, updateUser } = useAuth()
  const [newEmail, setNewEmail] = useState("")
  const [emailOtp, setEmailOtp] = useState("")
  const [otpCooldown, setOtpCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: (user as ProfileUser | null)?.phone || "",
      bio: (user as ProfileUser | null)?.bio || "",
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: userAPI.updateProfile,
    onSuccess: (response: UpdateProfileResponse) => {
      if (response.data?.user) updateUser(response.data.user)
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      })
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: userAPI.uploadAvatar,
    onSuccess: (response: UpdateProfileResponse) => {
      if (response.data?.avatarUrl) updateUser({ avatar: response.data.avatarUrl })
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to upload avatar",
        variant: "destructive",
      })
    },
  })

  const requestEmailOtpMutation = useMutation({
    mutationFn: (payload: { newEmail: string; password?: string }) => userAPI.requestEmailChangeOtp(payload),
    onSuccess: (response: UpdateProfileResponse) => {
      const devOtp = response?.data?.devOtp
      toast({
        title: "Verification code sent",
        description: devOtp ? `OTP (dev): ${devOtp}` : "Check your new email inbox for the OTP.",
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Failed to send OTP",
        description: error?.message || "Could not send verification code.",
        variant: "destructive",
      })
    },
  })

  const verifyEmailOtpMutation = useMutation({
    mutationFn: (payload: { otp: string }) => userAPI.verifyEmailChangeOtp(payload),
    onSuccess: (response: UpdateProfileResponse) => {
      updateUser(response?.data?.user || {})
      setNewEmail("")
      setEmailOtp("")
      toast({
        title: "Email updated",
        description: "Your email has been changed successfully.",
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Failed to verify OTP",
        description: error?.message || "Invalid or expired code.",
        variant: "destructive",
      })
    },
  })

  const resendEmailOtpMutation = useMutation({
    mutationFn: () => userAPI.resendEmailChangeOtp(),
    onSuccess: (response: UpdateProfileResponse) => {
      const devOtp = response?.data?.devOtp
      setOtpCooldown(60)
      toast({
        title: "OTP resent",
        description: devOtp ? `OTP (dev): ${devOtp}` : "A new OTP was sent to your pending email.",
      })
    },
    onError: (error: ErrorWithMessage) => {
      toast({
        title: "Failed to resend OTP",
        description: error?.message || "Please try again shortly.",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data)
  }

  const canRequestOtp = useMemo(() => {
    const next = newEmail.trim().toLowerCase()
    return !!next && next !== String(user?.email || "").toLowerCase()
  }, [newEmail, user?.email])

  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('avatar', file)
      uploadAvatarMutation.mutate(formData)
    }
  }

  if (!user) return null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.avatar || "/placeholder.svg"} />
          <AvatarFallback className="text-lg">
            {getInitials(user.firstName, user.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <Label htmlFor="avatar" className="cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-primary hover:text-primary/80">
              <Camera className="h-4 w-4" />
              Change Avatar
            </div>
          </Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG or GIF. Max size 5MB.
          </p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register("firstName")}
            disabled={updateProfileMutation.isPending}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register("lastName")}
            disabled={updateProfileMutation.isPending}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          disabled
        />
        <p className="text-xs text-muted-foreground">Current email is read-only. Use the Change Email section below.</p>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="space-y-1">
          <Label htmlFor="newEmail">Change Email</Label>
          <Input
            id="newEmail"
            type="email"
            placeholder="Enter new email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={requestEmailOtpMutation.isPending || verifyEmailOtpMutation.isPending}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canRequestOtp || requestEmailOtpMutation.isPending || verifyEmailOtpMutation.isPending}
            onClick={() => {
              requestEmailOtpMutation.mutate({ newEmail: newEmail.trim() })
              setOtpCooldown(60)
            }}
          >
            {requestEmailOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send OTP
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={
              otpCooldown > 0 ||
              resendEmailOtpMutation.isPending ||
              requestEmailOtpMutation.isPending ||
              verifyEmailOtpMutation.isPending
            }
            onClick={() => resendEmailOtpMutation.mutate()}
          >
            {resendEmailOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
          </Button>
        </div>
        <div className="space-y-1">
          <Label htmlFor="emailOtp">Verify OTP</Label>
          <Input
            id="emailOtp"
            placeholder="6-digit OTP"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
            disabled={verifyEmailOtpMutation.isPending}
          />
        </div>
        <Button
          type="button"
          disabled={emailOtp.trim().length !== 6 || verifyEmailOtpMutation.isPending}
          onClick={() => verifyEmailOtpMutation.mutate({ otp: emailOtp.trim() })}
        >
          {verifyEmailOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify & Update Email
        </Button>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          {...register("phone")}
          disabled={updateProfileMutation.isPending}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio (Optional)</Label>
        <Textarea
          id="bio"
          placeholder="Tell us a bit about yourself..."
          {...register("bio")}
          disabled={updateProfileMutation.isPending}
        />
        {errors.bio && (
          <p className="text-sm text-destructive">{errors.bio.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={updateProfileMutation.isPending || uploadAvatarMutation.isPending}
      >
        {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  )
}
