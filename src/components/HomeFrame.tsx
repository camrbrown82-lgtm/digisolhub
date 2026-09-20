"use client";

import { useEffect } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";

function scrollHome(scroller: HTMLElement, hash: string) {
  const id = hash.replace("#", "");
  if (!id || id === "top" || id === "main") {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const target = scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!target) return;
  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop;
  scroller.scrollTo({ top, behavior: "smooth" });
}

export function HomeFrame() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    html.classList.add("home-locked");
    body.classList.add("home-locked");
    return () => {
      html.classList.remove("home-locked");
      body.classList.remove("home-locked");
    };
  }, []);

  useEffect(() => {
    const jump = () => {
      const scroller = document.getElementById("main");
      if (!(scroller instanceof HTMLElement)) return;
      scrollHome(scroller, window.location.hash);
    };

    jump();
    window.addEventListener("hashchange", jump);

    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;

      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== "/" && url.pathname !== "") return;
      if (!url.hash) return;

      event.preventDefault();
      if (window.location.hash !== url.hash) {
        window.location.hash = url.hash;
      } else {
        jump();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", jump);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-zinc-950">
      <Navbar pinned />
      <Hero />
      <div
        id="main"
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <DualThreat />
        <Services />
        <Audience />
        <Contact />
        <Footer />
      </div>
    </div>
  );
}
