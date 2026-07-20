import type { Metadata, Viewport } from "next";
import { Fira_Code, Open_Sans, Roboto } from "next/font/google";
import TopNav from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth";
import { getAbsoluteUrl, getSiteUrl, siteDescription, siteName } from "@/lib/site";
import { getAccountSettingsThemeForUser } from "@/lib/userSettings";
import "./globals.css";
import OfflineStatus from "@/components/OfflineStatus";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: siteName,
  title: {
    default: `${siteName} - Malaysia Community Deals`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  robots: {
    index: !process.env.SITE_ACCESS_PIN,
    follow: !process.env.SITE_ACCESS_PIN,
    googleBot: {
      index: !process.env.SITE_ACCESS_PIN,
      follow: !process.env.SITE_ACCESS_PIN,
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
    var existingTheme = localStorage.getItem(themeKey);
    if (serverTheme && existingTheme !== serverTheme) {
      localStorage.setItem(themeKey, serverTheme);
    }
    var stored = serverTheme || existingTheme || "auto";
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
        <>
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-md bg-white px-4 py-2 font-bold text-slate-950 shadow-lg transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/25"
          >
            Skip to main content
          </a>
          <OfflineStatus />
          <TopNav initialThemeMode={initialThemeMode ?? undefined} initialUser={user} />
          <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </div>
        </>
      </body>
    </html>
  );
}
