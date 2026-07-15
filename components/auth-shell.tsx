import type React from "react"
import Image from "next/image"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Image
              src="/mtn-logo.png"
              alt="MTN"
              width={72}
              height={72}
              className="h-[72px] w-[72px]"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">MoMo Loans</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Instant, secure lending on your Mobile Money account
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to the MoMo Loans Terms &amp; Conditions.
        </p>
      </div>
    </main>
  )
}
