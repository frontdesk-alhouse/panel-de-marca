"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/i18n/client";

/** Switch claro/oscuro: evita el mismatch de hidratación mostrando un placeholder hasta montar en cliente. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lectura de next-themes (localStorage) solo disponible tras montar en cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-md" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
      aria-label={isDark ? t.shell.toLight : t.shell.toDark}
      title={isDark ? t.shell.lightMode : t.shell.darkMode}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}
