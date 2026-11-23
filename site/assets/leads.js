import { config } from "./config.js";

export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) digits = "7" + digits;
  if (digits.length === 11 && digits.startsWith("8"))
    digits = "7" + digits.slice(1);
  return /^7\d{10}$/.test(digits) ? "+" + digits : null;
}

export function validateLead(lead) {
  if (!normalizePhone(lead.phone))
    return "Укажите российский номер: +7 и ещё 10 цифр.";
  if (lead.consent !== true) return "Подтвердите согласие, чтобы продолжить.";
  if (String(lead.name ?? "").trim().length > 80)
    return "Имя должно содержать не более 80 символов.";
  if (String(lead.comment ?? "").length > 2000)
    return "Описание должно содержать не более 2 000 символов.";
  if (
    ![
      "drilling",
      "cutting",
      "reinforcement",
      "demolition",
      "consultation",
    ].includes(lead.service)
  )
    return "Выберите услугу.";
  if (!["contact", "calculator", "callback"].includes(lead.source))
    return "Не удалось определить форму. Обновите страницу.";
  return null;
}

export async function submitLead(lead, options = {}) {
  const error = validateLead(lead);
  if (error) throw new Error(error);
  const demo = options.demo ?? config.DEMO_MODE;
  // TODO(BACKEND): This adapter is the only submission point. The server must validate
  // again, rate-limit, persist to its DB and handle notifications. See docs/backend.md.
  // Demo NEVER transmits, logs or stores personal details, even in localStorage.
  if (demo) return { mode: "demo", submitted: false };
  const apiUrl = options.apiUrl ?? config.API_URL;
  if (!/^https:\/\//.test(apiUrl))
    throw new Error("Сервис заявок ещё не подключён. Попробуйте позже.");
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(apiUrl.replace(/\/$/, "") + "/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey ?? crypto.randomUUID(),
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      name: String(lead.name ?? "").trim(),
      phone: normalizePhone(lead.phone),
      service: lead.service,
      comment: String(lead.comment ?? "").trim(),
      estimate: lead.estimate ?? null,
      source: lead.source,
      consent: true,
      consentVersion: "2026-11-23",
      website: String(lead.website ?? ""),
    }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Слишком много попыток. Попробуйте немного позже."
        : "Не удалось отправить заявку. Попробуйте ещё раз.",
    );
  const result = await response.json();
  if (!result.id)
    throw new Error("Сервис не подтвердил приём заявки. Попробуйте позже.");
  return { mode: "live", submitted: true, id: result.id };
}
