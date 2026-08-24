import type { SupportedLocale } from "./types";

const copy = {
  "ar-SA": {
    documentation: "التوثيق",
    productName: "ACCORE ERP",
    documentationHome: "مدخل التوثيق",
    system: "النظام",
    openMenu: "فتح قائمة التوثيق",
    closeMenu: "إغلاق قائمة التوثيق",
    enableDarkMode: "تفعيل الوضع الداكن",
    enableLightMode: "تفعيل الوضع الفاتح",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    thisPage: "في هذه الصفحة",
    previous: "السابق",
    next: "التالي",
    loading: "يجري تحميل صفحة التوثيق…",
    failed: "تعذر تحميل صفحة التوثيق.",
    retry: "إعادة المحاولة",
    returnToSystem: "العودة إلى النظام",
    renderedBy: "بوابة توثيق Accore ERP",
    noHeadings: "لا توجد عناوين فرعية في هذه الصفحة.",
  },
  "en-US": {
    documentation: "Documentation",
    productName: "ACCORE ERP",
    documentationHome: "Documentation home",
    system: "System",
    openMenu: "Open documentation menu",
    closeMenu: "Close documentation menu",
    enableDarkMode: "Enable dark mode",
    enableLightMode: "Enable light mode",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    thisPage: "On this page",
    previous: "Previous",
    next: "Next",
    loading: "Loading documentation…",
    failed: "The documentation page could not be loaded.",
    retry: "Retry",
    returnToSystem: "Return to system",
    renderedBy: "Accore ERP documentation portal",
    noHeadings: "This page has no subheadings.",
  },
} as const;

export const documentationRuntime = {
  basePath: "/docs",
  frontmatterTitlePrefix: "title:",
} as const;

export function normaliseDocumentationHref(href: string): string {
  const withoutExtension = href.replace(/\.mdx?$/i, "");
  if (withoutExtension.startsWith(`${documentationRuntime.basePath}/`)) return withoutExtension;
  if (withoutExtension.startsWith("docs/")) return `/${withoutExtension}`;
  if (withoutExtension.startsWith("/")) return `${documentationRuntime.basePath}${withoutExtension}`;
  return `${documentationRuntime.basePath}/${withoutExtension}`;
}

export function getDocumentationCopy(locale: SupportedLocale) {
  return copy[locale];
}
