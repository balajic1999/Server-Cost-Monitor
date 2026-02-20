import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CloudPulse – Real-Time Cloud Cost Monitor",
  description: "Monitor AWS and GCP cloud spending in near real time. Get alerts when costs spike.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

