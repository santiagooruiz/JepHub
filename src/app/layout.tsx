import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "JEP-Hub",
  description: "CRM de JEP Mobiliari",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=localStorage.getItem('density')||'compact';document.documentElement.setAttribute('data-density',d);}catch(e){document.documentElement.setAttribute('data-density','compact');}",
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
