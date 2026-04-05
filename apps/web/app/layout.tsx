import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext";
import { ThemeProvider } from "../contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CloudPulse – Cloud cost clarity",
  description: "See cloud spend in seconds. Minimal dashboards for AWS, GCP, and Azure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} min-h-screen bg-zinc-50 text-zinc-900 antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
