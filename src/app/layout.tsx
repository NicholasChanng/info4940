import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "p5 Sketch Coach",
  description:
    "An LLM-powered coach that helps novice programmers turn life experiences into p5.js sketches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
