import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Gratis kentekencheck: RDW-gegevens & APK | RitVizier",
    template: "%s | RitVizier",
  },
  description:
    "Doe een gratis kentekencheck met openbare RDW-gegevens. Bekijk specificaties, APK en terugroepacties en bereken je autokosten. Zonder account.",
  applicationName: "RitVizier",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/icon-192.png" },
  openGraph: {
    title: "RitVizier",
    description: "Alles over je auto. Helder in beeld.",
    locale: "nl_NL",
    type: "website",
    images: ["/social-preview.png"],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2457F5",
};
const themeScript = `(function(){try{var t=localStorage.getItem('ritvizier:theme')||'system';var m=matchMedia('(prefers-color-scheme: dark)');function apply(){document.documentElement.dataset.theme=t==='dark'||t==='system'&&m.matches?'dark':'light'}apply();m.addEventListener('change',function(){t=localStorage.getItem('ritvizier:theme')||'system';apply()})}catch(e){}})();`;
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Naar de inhoud
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
