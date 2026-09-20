import { Mail, Phone } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";

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
] as const;

const linkClass = {
  hero: "inline-flex items-center gap-1.5 text-xs text-zinc-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:text-sm",
  footer:
    "inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400",
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
        <span
          className={
            isHero ? "font-medium text-white" : "font-medium text-zinc-200"
          }
        >
          Cameron Brown
        </span>
      </span>
      <span
        className={
          isHero
            ? "mt-0.5 block text-[11px] leading-snug text-zinc-400 sm:text-xs"
            : "mt-0.5 block text-zinc-500"
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
    >
      <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
      {label}
    </TrackedLink>
  ));

  if (isHero) {
    return (
      <div className="min-w-0 flex-1 basis-52">
        <p className="text-xs text-zinc-300 sm:text-sm">
          <Identity location={location} />
        </p>
        <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
          {links}
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      <li className="text-sm text-zinc-400">
        <Identity location={location} />
      </li>
      {links.map((link) => (
        <li key={link.key}>{link}</li>
      ))}
    </ul>
  );
}
