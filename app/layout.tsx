import type { Metadata } from "next";
import { Fira_Code, Open_Sans, Roboto } from "next/font/google";
import TopNav from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth";
import { getAbsoluteUrl, getSiteUrl, siteDescription, siteName } from "@/lib/site";
import { getAccountSettingsThemeForUser } from "@/lib/userSettings";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: siteName,
  title: {
    default: `${siteName} - Malaysia Community Deals`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: `${siteName} - Malaysia Community Deals`,
    description: siteDescription,
    url: getAbsoluteUrl("/"),
    siteName,
    locale: "en_MY",
    type: "website",
    images: [
      {
        url: "/deal-rakyat-og.svg",
        width: 1200,
        height: 630,
        alt: `${siteName} community deals`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - Malaysia Community Deals`,
    description: siteDescription,
    images: ["/deal-rakyat-og.svg"],
  },
};

type ThemeMode = "auto" | "dark" | "light";

function toThemeMode(theme: "dark" | "light" | "system" | null): ThemeMode | null {
  if (theme === "dark" || theme === "light") {
    return theme;
  }

  if (theme === "system") {
    return "auto";
  }

  return null;
}

function createThemeScript(initialThemeMode: ThemeMode | null) {
  const serializedThemeMode = JSON.stringify(initialThemeMode);

  return `
(function () {
  try {
    var themeKey = "dealmy_theme";
    var ambientKey = "dealmy_ambient";
    var serverTheme = ${serializedThemeMode};
    if (serverTheme) {
      localStorage.setItem(themeKey, serverTheme);
    }
    var stored = serverTheme || localStorage.getItem(themeKey) || "auto";
    var ambient = localStorage.getItem(ambientKey) === "off" ? "off" : "on";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = stored === "dark" || (stored === "auto" && prefersDark) ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.ambient = ambient;
  } catch (_) {
  }
})();
`;
}

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-open-sans",
  display: "swap",
  fallback: ["Roboto", "sans-serif"],
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
  fallback: ["sans-serif"],
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fira-code",
  display: "swap",
  fallback: ["monospace"],
});

/**
 * Wraps every route with the required HTML/body shell and global font classes.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const savedTheme = user
    ? await getAccountSettingsThemeForUser(user.id).catch(() => null)
    : null;
  const initialThemeMode = toThemeMode(savedTheme);

  return (
    <html lang="en" className="h-full antialiased" data-ambient="on" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: createThemeScript(initialThemeMode) }} />
      </head>
      <body className={`${openSans.variable} ${roboto.variable} ${firaCode.variable} min-h-full flex flex-col`}>
        <TopNav initialThemeMode={initialThemeMode ?? undefined} initialUser={user} />
        {children}
      </body>
    </html>
  );
}
