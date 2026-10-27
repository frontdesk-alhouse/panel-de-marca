"use client";

import { createContext, useContext } from "react";
import { messages, type Lang, type Messages } from "./index";

const LangContext = createContext<Lang>("es");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = (): Lang => useContext(LangContext);
export const useT = (): Messages => messages(useContext(LangContext));
