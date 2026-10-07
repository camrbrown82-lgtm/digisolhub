import { Linkedin, Mail, Phone } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { XIcon } from "@/components/XIcon";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DIGISOL_EMAIL, DIGISOL_LINKEDIN_URL, DIGISOL_X_HANDLE, DIGISOL_X_URL, LINKEDIN_ENABLED } from "@/lib/site";

const allContacts = [
  {
    href: "tel:+15875770782",
    method: "phone",
    label: "1-587-577-0782",
    icon: Phone,
  },
  {
    href: `mailto:${DIGISOL_EMAIL}`,
    method: "email",
    label: DIGISOL_EMAIL,
    icon: Mail,
  },
  {
    href: DIGISOL_LINKEDIN_URL,
    method: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    href: DIGISOL_X_URL,
    method: "x",
    label: `@${DIGISOL_X_HANDLE}`,
    icon: XIcon,
  },
] as const;

const contacts = allContacts.filter((contact) => contact.method !== "linkedin" || LINKEDIN_ENABLED);

const linkClass = {
  hero: "inline-flex items-center gap-1.5 text-xs text-indigo-200 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
  footer:
    "inline-flex items-center gap-1.5 text-sm text-indigo-300/90 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
};

type ContactInfoProps = {
  location: "hero" | "footer";
};

function Identity({ location }: ContactInfoProps) {
  const isHero = location === "hero";
  const t = getMessages(getLocale()).contactInfo;

  return (
    <span>
      <span className="block">
        {t.founder}{" "}
        <span className="font-medium text-sky-300">Cameron Brown</span>
      </span>
      <span
        className={
          isHero
            ? "mt-0.5 block text-xs leading-snug text-indigo-300/80"
            : "mt-0.5 block text-indigo-300/70"
        }
      >
        {t.credentials}
      </span>
    </span>
  );
}

export function ContactInfo({ location }: ContactInfoProps) {
  const isHero = location === "hero";
  const t = getMessages(getLocale()).contactInfo;

  const links = contacts.map(({ href, method, label, icon: Icon }) => (
    <TrackedLink
      key={method}
      href={href}
      eventName="contact_click"
      eventParams={{ method, location }}
      className={linkClass[location]}
      {...(method === "linkedin" || method === "x"
        ? { target: "_blank", rel: "noopener noreferrer me" }
        : {})}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </TrackedLink>
  ));

  if (isHero) {
    // One centered row — same midline as logo + nav (no stacked blocks).
    return (
      <div className="flex max-w-full items-center justify-center gap-x-3 overflow-hidden whitespace-nowrap text-sm leading-none text-indigo-100">
        <p className="shrink-0">
          {t.founder}{" "}
          <span className="font-medium text-sky-300">Cameron Brown</span>
        </p>
        <span className="h-3.5 w-px shrink-0 bg-indigo-500/35" aria-hidden="true" />
        {links}
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2.5">
      <li className="text-sm leading-snug text-indigo-100/90">
        <Identity location={location} />
      </li>
      {links.map((link) => (
        <li key={link.key}>{link}</li>
      ))}
    </ul>
  );
}
