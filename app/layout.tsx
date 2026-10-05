import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider, type ThemePreference } from "@/components/theme/theme-context";
import { validateEnv } from "@/lib/env";
import "./globals.css";

// Fail loudly at boot if required environment variables are missing
validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph",
  description: "Structural codebase dependency visualizer and architecture map",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("cartograph-theme")?.value;
  const initialTheme: ThemePreference =
    themeCookie === "light" || themeCookie === "dark" || themeCookie === "system"
      ? themeCookie
      : "system";

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      className={`${geistSans.variable} ${geistMono.variable} ${
        initialTheme === "dark" ? "dark" : initialTheme === "light" ? "light" : ""
      }`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/cartograph-theme=(system|light|dark)/);var t=m?m[1]:(localStorage.getItem('cartograph-theme')||'system');var r=document.documentElement;r.dataset.theme=t;if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){r.classList.add('dark');r.classList.remove('light');}else{r.classList.add('light');r.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased select-none overflow-hidden">
        <ClerkProvider>
          <ThemeProvider initialTheme={initialTheme}>
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}