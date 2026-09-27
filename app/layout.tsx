import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import ReminderBanner from "@/components/ReminderBanner";

export const metadata: Metadata = {
  title: "Self-Analysis Dashboard",
  description: "Помодоры, ревью дня/недели/месяца и динамика продуктивности",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Nav />
        <ReminderBanner />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
