"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Send, User } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { trackEvent } from "@/lib/analytics";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

const OWNER_EMAIL = "cam.r.brown82@gmail.com";

export function Contact() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSending(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("fullName"),
          email: data.get("email"),
          company: data.get("business"),
          service: data.get("service"),
          message: data.get("details"),
          botcheck: data.get("botcheck"),
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Could not send the request.");
      }
      trackEvent("generate_lead", {
        method: "web3forms",
        service: String(data.get("service") ?? ""),
      });
      router.push("/confirmation");
    } catch {
      setError(
        "Something went wrong sending the form. Email cam.r.brown82@gmail.com or call 1-587-577-0782.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      id="contact"
      className="border-t border-white/10 bg-zinc-900/40 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Contact
          </p>
          <h2
            id="contact-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Ready to Scale Your Online Presence?
          </h2>
          <p className="mt-4 text-zinc-400">
            Get in touch for a direct project quote or free strategy
            consultation.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-3">
              <User className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
              <span>
                Owner{" "}
                <span className="font-medium text-white">Cameron Brown</span>
              </span>
            </li>
            <li>
              <TrackedLink
                href="tel:+15875770782"
                eventName="contact_click"
                eventParams={{ method: "phone", location: "contact" }}
                className="inline-flex items-center gap-3 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                <Phone className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
                1-587-577-0782
              </TrackedLink>
            </li>
            <li>
              <TrackedLink
                href={`mailto:${OWNER_EMAIL}`}
                eventName="contact_click"
                eventParams={{ method: "email_gmail", location: "contact" }}
                className="inline-flex items-center gap-3 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                <Mail className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
                {OWNER_EMAIL}
              </TrackedLink>
            </li>
            <li>
              <TrackedLink
                href="mailto:digisol2026@yahoo.com"
                eventName="contact_click"
                eventParams={{ method: "email_yahoo", location: "contact" }}
                className="inline-flex items-center gap-3 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                <Mail className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
                digisol2026@yahoo.com
              </TrackedLink>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md sm:p-8">
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="checkbox"
                name="botcheck"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className={fieldClass}
                  placeholder="Alex Rivera"
                />
              </div>
              <div>
                <label
                  htmlFor="business"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Business Name &amp; Domain
                </label>
                <input
                  id="business"
                  name="business"
                  type="text"
                  autoComplete="organization"
                  required
                  className={fieldClass}
                  placeholder="Acme Co — acme.com"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={fieldClass}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="service"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Service Needed
                </label>
                <select
                  id="service"
                  name="service"
                  required
                  defaultValue=""
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                  }}
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option value="custom-web-dev">Custom Web Dev</option>
                  <option value="digital-marketing">Digital Marketing</option>
                  <option value="combined-full-package">
                    Combined Full Package
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="details"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Project Details
                </label>
                <textarea
                  id="details"
                  name="details"
                  required
                  rows={5}
                  className={`${fieldClass} resize-y`}
                  placeholder="Goals, timeline, current stack, and what success looks like…"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending…" : "Request Free Consultation"}
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
        </div>
      </div>
    </section>
  );
}
