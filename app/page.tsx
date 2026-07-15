import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in to continue"
      description="Use your MTN number and MoMo PIN to access your loans."
    >
      <LoginForm />
    </AuthShell>
  )
}
