export function jsonSafeText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function jsonSafeValue<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value)
      .replace(/\u0000/g, "")
      .replace(/[\uD800-\uDFFF]/g, ""),
  ) as T;
}
