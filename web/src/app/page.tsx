import Link from "next/link";
import { AppFrame } from "@/components/app-shell/app-frame";
import { buttonVariants } from "@/components/ui/button";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedRow, IosGroupedSection } from "@/components/ui/ios-grouped-section";

export default function Home() {
  return (
    <AppFrame>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto">
        <IosLargeTitle
          title="Fit Finder"
          subtitle="Know if you fit the job before you apply."
        />
        <div className="flex-1 py-6 space-y-6">
          <IosGroupedSection>
            <IosGroupedRow className="space-y-4 text-[17px] leading-snug">
              <p>
                Paste a job description and get an instant fit report — no
                account required. Create a profile when you want sharper,
                personalized recommendations.
              </p>
            </IosGroupedRow>
          </IosGroupedSection>
          <div className="px-4 space-y-3">
            <Link
              href="/analyze"
              className={buttonVariants({ className: "w-full h-12 rounded-xl text-[17px]" })}
            >
              Analyze a Job
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: "outline", className: "w-full h-12 rounded-xl text-[17px]" })}
            >
              Create a Profile
            </Link>
            <Link
              href="/preview"
              className={buttonVariants({ variant: "ghost", className: "w-full h-11 rounded-xl" })}
            >
              See a sample report
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", className: "w-full h-11" })}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
