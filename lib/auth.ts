export function safeAuthNext(value: string, fallback = "/carrito"): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}
