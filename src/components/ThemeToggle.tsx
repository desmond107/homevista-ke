"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Inline script for <head>: applies a saved theme before paint (no flash). */
export const themeInitScript = `try{var t=localStorage.getItem('hv-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("hv-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button type="button" onClick={toggle} className={`btn-ghost h-10 w-10 !p-0 ${className}`} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
