import Link from "next/link";
import { headingDisplayClass } from "../../lib/ui";

export const metadata = {
    title: "Privacy Policy — CloudPulse"
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Draft — updated 2026-05-29</p>
                <h1 className={`mt-2 ${headingDisplayClass}`}>Privacy Policy</h1>

                <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
                    <p>
                        CloudPulse stores the minimum data needed to fetch and display your cloud cost reports: your
                        email and name, the cloud-provider credentials you submit, and the cost records returned by
                        the AWS, GCP, or Azure billing APIs. Credentials are encrypted at rest with AES-256-GCM.
                    </p>
                    <p>
                        We do not sell, share, or use your data for marketing. We do not run third-party trackers on
                        this site. Cost records are retained according to your plan (7 days on Free, 90 days on Pro)
                        and you can delete your account and all associated data at any time from{" "}
                        <Link href="/dashboard/settings" className="text-accent hover:underline">
                            Settings
                        </Link>
                        .
                    </p>
                    <p className="text-xs text-muted-foreground">
                        This page is a working draft. A finalized policy and contact-DPO instructions will be linked
                        here before public launch.
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
