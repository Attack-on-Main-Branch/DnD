import { Cinzel, Geist, Geist_Mono } from "next/font/google";

import PathsBackground from "./components/paths-background/paths-background";
import NavigationProgress from "./components/ui/navigation-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The display face. Variable (wght 400-900), normal only — no italic exists,
 * so nothing should ask for one. `weight` is deliberately omitted: that is
 * what selects the full variable range, and passing it alongside would error.
 */
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Grimoire Tales",
  description: "Campaign companion for your tabletop group.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          One instance, mounted once, before everything else. It is
          position: fixed, so it takes no slot in this flex column.

          Nothing on the ancestor chain — <html> or <body> — may ever gain
          `transform`, `filter`, `backdrop-filter`, `perspective`, a
          `will-change` on those, or `contain`. Any of them makes that element
          the containing block for fixed positioning, and the background would
          size itself to it rather than to the viewport.
        */}
        <PathsBackground />

        {/*
          Outside {children} on purpose: the layout survives every navigation,
          so the bar is still mounted when the page it announced arrives.
        */}
        <NavigationProgress />

        {/*
          Lifts every page above the background, which sits at z-index 0.
          Without this the app renders as a black screen: the content is still
          there and still clickable — the background sets pointer-events: none
          — but painted underneath.

          z-10 rather than something higher because the progress bar claims
          z-50 in this same stacking context and has to stay on top.

          The flex classes are not decoration: each page's <main> uses `flex-1`
          to fill the viewport, and an unstyled wrapper would break that chain
          and cost the login page its vertical centering.
        */}
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
