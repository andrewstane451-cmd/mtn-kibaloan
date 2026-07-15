import { AuthShell } from "@/components/auth-shell"
import { LoanForm } from "@/components/loan-form"

export default async function LoanPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>
}) {
  const { phone } = await searchParams

  return (
    <AuthShell
      title="Your loan offer"
      description="Drag to choose how much you'd like to borrow."
    >
      <LoanForm phone={phone ?? ""} />
    </AuthShell>
  )
}
