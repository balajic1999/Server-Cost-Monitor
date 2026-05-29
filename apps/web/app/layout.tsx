import "./globals.css";
import { Inter, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap"
});

const serif = Source_Serif_4({
    subsets: ["latin"],
    variable: "--font-serif",
    display: "swap",
    weight: ["400", "500", "600"]
});

export const metadata = {
    title: "CloudPulse – Cloud cost clarity",
    description: "See cloud spend in seconds. Minimal dashboards for AWS, GCP, and Azure."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${serif.variable}`}>
            <body className="min-h-screen bg-background font-sans text-foreground antialiased">
                <AuthProvider>
                    <ToastProvider>{children}</ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
