import type { Metadata } from "next";
import { Red_Hat_Text } from "next/font/google";
import "./globals.css";

const redHatText = Red_Hat_Text({
  variable: "--font-red-hat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MySkin - Personalized Telehealth Skincare Care for Gen-Z",
  description: "Solusi perawatan kulit via AI dan telehealth — simpel, cepat, dan teruji ilmiah khusus untuk masalah jerawat, dark spot, dan breakout.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${redHatText.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#1A1A1A] font-sans selection:bg-[#153828] selection:text-white">
        {children}
      </body>
    </html>
  );
}


