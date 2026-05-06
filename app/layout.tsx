import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealMY",
  description: "Malaysia-focused community deals.",
};

const themeScript = `
(function () {
  try {
    var key = "dealmy_theme";
    var stored = localStorage.getItem(key) || "auto";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = stored === "dark" || (stored === "auto" && prefersDark) ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
  } catch (_) {
  }
})();
`;

/**
 * Wraps every route with the required HTML/body shell and global font classes.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
