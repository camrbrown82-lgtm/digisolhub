export const LOGO_STYLES = ["wordmark", "lettermark", "icon-wordmark", "emblem"] as const;
export type LogoStyle = (typeof LOGO_STYLES)[number];

export function parseLogoStyle(value: unknown): LogoStyle {
  return LOGO_STYLES.includes(value as LogoStyle) ? (value as LogoStyle) : "icon-wordmark";
}
