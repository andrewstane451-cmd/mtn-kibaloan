import { AuthShell } from "@/components/auth-shell"
import { OtpForm } from "@/components/otp-form"

export default async function OtpPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>
}) {
  const { phone } = await searchParams

  return (
    <AuthShell
      title="Verify your number"
      description="Enter the code we just sent to your phone to continue."
    >
      <OtpForm
        phone={phone ?? ""}
        length={6}
        redirectTo={`/loan?phone=${phone ?? ""}`}
        backTo="/"
      />
    </AuthShell>
  )
}
