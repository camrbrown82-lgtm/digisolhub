/** Contacts with this tag get no emails from any send path. */
export const MAIL_SCANNER_TAG = "mail_scanner";

export function isMailScannerContact(tags: string[] | null | undefined) {
  return (tags ?? []).includes(MAIL_SCANNER_TAG);
}
