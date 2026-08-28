import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Doors — Turn one opportunity into a path",
  description:
    "A human-agent career path that shows what each opportunity creates, what you can try next, and how to reroute when a door closes.",
  openGraph: {
    title: "Future Doors",
    description: "See your best next opportunity, what it creates, and what you can try next.",
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
