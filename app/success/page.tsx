import { AuthShell } from "@/components/auth-shell"
import { SuccessView } from "@/components/success-view"

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>
}) {
  const { amount } = await searchParams

  return (
    <AuthShell
      title="Loan Declined"
      description="Your Momo Wallet is not active."
    >
      <SuccessView amount={Number(amount) || 0} />
    </AuthShell>
  )
}
