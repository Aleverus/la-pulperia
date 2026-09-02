const E164 = /^\+[1-9]\d{7,14}$/;

export function isE164(value: string): boolean {
  return E164.test(value);
}

export function normalizeWhatsapp(input: string): string | null {
  const trimmed = input.trim();
  if (isE164(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) return `+504${digits}`;
  if (digits.length === 11 && digits.startsWith("504")) return `+${digits}`;
  if (isE164(`+${digits}`)) return `+${digits}`;
  return null;
}

export function waMeUrl(e164: string, text: string): string {
  if (!isE164(e164)) {
    throw new Error("whatsapp_e164_invalid");
  }

  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(text)}`;
}

export function whatsappProbeMessage(presenceName: string): string {
  return `Hola, esta es una prueba para ${presenceName} en La Pulpería. Si este mensaje llegó al WhatsApp correcto, volvé a La Pulpería y confirmalo. La plataforma no lee este chat.`;
}
