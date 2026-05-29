import Link from "next/link";
import { headingDisplayClass } from "../../lib/ui";

export const metadata = {
    title: "Terms of Service — CloudPulse"
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Draft — updated 2026-05-29</p>
                <h1 className={`mt-2 ${headingDisplayClass}`}>Terms of Service</h1>

                <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
                    <p>
                        CloudPulse provides read-only visibility into the cloud-spend reports returned by your
                        AWS, GCP, or Azure billing APIs. You are responsible for the credentials and IAM permissions
                        you grant the service, and for the accuracy of the data those providers return.
                    </p>
                    <p>
                        The service is provided as-is with no uptime or accuracy guarantee while in beta. Paid plans
                        are billed monthly through Stripe; you may cancel at any time and retain access through the
                        end of the paid period. Abuse, scraping, or attempts to bypass plan limits will result in
                        account suspension.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        This page is a working draft. Final terms, governing-law jurisdiction, and SLA language will
                        be linked here before public launch.
                    </p>
                </div>

                <div className="mt-10 border-t border-border pt-6 text-sm">
                    <Link href="/" className="text-accent hover:underline">
                        ← Back to CloudPulse
                    </Link>
                </div>
            </div>
        </main>
    );
}
