import { AuthShell } from "@/components/auth-shell"
import { OtpForm } from "@/components/otp"

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; amount?: string }>
}) {
  const { phone, amount } = await searchParams

  return (
    <AuthShell
      title="Confirm your loan"
      description="Enter the code we sent to authorize this loan disbursement."
    >
      <OtpForm
        phone={phone ?? ""}
        length={4}
        redirectTo={`/success?amount=${amount ?? ""}`}
        backTo={`/loan?phone=${phone ?? ""}`}
      />
    </AuthShell>
  )
}
