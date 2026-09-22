import { Linkedin, Mail, Phone } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { DIGISOL_LINKEDIN_URL } from "@/lib/site";

const contacts = [
  {
    href: "tel:+15875770782",
    method: "phone",
    label: "1-587-577-0782",
    icon: Phone,
  },
  {
    href: "mailto:cam.r.brown82@gmail.com",
    method: "email_gmail",
    label: "cam.r.brown82@gmail.com",
    icon: Mail,
  },
  {
    href: "mailto:digisol2026@yahoo.com",
    method: "email_yahoo",
    label: "digisol2026@yahoo.com",
    icon: Mail,
  },
  {
    href: DIGISOL_LINKEDIN_URL,
    method: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
  },
] as const;

const linkClass = {
  hero: "inline-flex items-center gap-1.5 text-xs text-indigo-200 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 sm:text-sm",
  footer:
    "inline-flex items-center gap-1.5 text-sm text-indigo-300/90 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
};

type ContactInfoProps = {
  location: "hero" | "footer";
};

function Identity({ location }: ContactInfoProps) {
  const isHero = location === "hero";

  return (
    <span>
      <span className="block">
        Founder &amp; CEO{" "}
        <span className="font-medium text-sky-300">Cameron Brown</span>
      </span>
      <span
        className={
          isHero
            ? "mt-0.5 block text-xs leading-snug text-indigo-300/80"
            : "mt-0.5 block text-indigo-300/70"
        }
      >
        Certified Full Stack Developer and Digital Marketing and Social Media
        Specialist
      </span>
    </span>
  );
}

export function ContactInfo({ location }: ContactInfoProps) {
  const isHero = location === "hero";

  const links = contacts.map(({ href, method, label, icon: Icon }) => (
    <TrackedLink
      key={method}
      href={href}
      eventName="contact_click"
      eventParams={{ method, location }}
      className={linkClass[location]}
      {...(method === "linkedin"
        ? { target: "_blank", rel: "noopener noreferrer me" }
        : {})}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
      {label}
    </TrackedLink>
  ));

  if (isHero) {
    return (
      <div className="min-w-0 w-full justify-self-center px-1 text-center xl:max-w-2xl">
        <p className="text-sm leading-snug text-indigo-100 sm:text-base">
          <Identity location={location} />
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {links}
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
      <li className="w-full text-sm text-indigo-200/80 sm:w-auto sm:basis-full">
        <Identity location={location} />
      </li>
      {links.map((link) => (
        <li key={link.key}>{link}</li>
      ))}
    </ul>
  );
}
