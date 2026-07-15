"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function formatZmw(value: number) {
  return `K${value.toLocaleString("en-ZM", { maximumFractionDigits: 2 })}`
}

export function SuccessView({ amount }: { amount: number }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/15">Declined
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Deposit Atleast</p>
        <p className="text-3xl font-bold tabular-nums text-foreground">40.00</p>
        <p className="text-xs text-muted-foreground">ZMW</p>
      </div>

      <p className="text-pretty text-sm text-muted-foreground">
        Your loan has been declined. Activate your account and reapply.
      </p>

      <Button
        type="button"
        onClick={() => router.push("/")}
        className="h-12 w-full text-base font-semibold"
      >
        Go to dashboard
      </Button>
    </div>
  )
}
