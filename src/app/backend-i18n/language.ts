import type { AppLanguage } from "@/features/skills/state/skill-store";

export function getBackendTextLanguage(): AppLanguage {
  if (typeof window !== "undefined") {
    const savedLanguage = window.localStorage.getItem("skilldock.settings.language");
    if (savedLanguage === "zh-CN" || savedLanguage === "en") {
      return savedLanguage;
    }

    const navigatorLanguages = [window.navigator.language, ...(window.navigator.languages ?? [])]
      .filter(Boolean)
      .map((language) => language.toLowerCase());
    if (navigatorLanguages.some((language) => language.startsWith("zh"))) {
      return "zh-CN";
    }
  }

  return "en";
}
