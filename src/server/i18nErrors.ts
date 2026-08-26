import type { Request } from "express";

export type Lang = "tr" | "en";

export function pickLang(req: Request): Lang {
  const al = String(req.headers["accept-language"] || "").toLowerCase();
  return al.includes("tr") ? "tr" : "en";
}

export function msg(lang: Lang, trText: string, enText: string): string {
  return lang === "tr" ? trText : enText;
}
