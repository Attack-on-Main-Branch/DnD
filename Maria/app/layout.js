import { Geist, Geist_Mono } from "next/font/google";

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

export const metadata = {
  title: "Dungeons and Demons",
  description: "Campaign companion for your tabletop group.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Outside {children} on purpose: the layout survives every navigation,
          so the bar is still mounted when the page it announced arrives.
        */}
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
