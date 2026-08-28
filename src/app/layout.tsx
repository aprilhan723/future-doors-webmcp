import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Doors — From a saved post to a real plan",
  description:
    "Share an opportunity screenshot, check the official rules, and see what to do now and what it can open next.",
  openGraph: {
    title: "Future Doors",
    description: "Turn a saved opportunity into a step-by-step plan you can check and change.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
