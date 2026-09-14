import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Your marketing brain, built around your business.`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "An intelligent marketing workspace for startups and small businesses. Generic AI tells you what usually works. MarketMind learns what works for you.",
  icons: {
    icon: "/marketmind-icon.png",
    shortcut: "/marketmind-icon.png",
    apple: "/marketmind-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mm-bg text-mm-ink antialiased">
        {children}
      </body>
    </html>
  );
}
