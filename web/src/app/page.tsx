import Link from "next/link";
import { AppFrame } from "@/components/app-shell/app-frame";
import { buttonVariants } from "@/components/ui/button";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { IosGroupedRow, IosGroupedSection } from "@/components/ui/ios-grouped-section";

export default function Home() {
  return (
    <AppFrame>
      <div className="flex min-h-dvh flex-col">
        <IosLargeTitle
          title="Fit Finder"
          subtitle="Know if you fit the job before you apply."
        />
        <div className="flex-1 py-6 space-y-6">
          <IosGroupedSection>
            <IosGroupedRow className="space-y-4 text-[17px] leading-snug">
              <p>
                One app on iPhone, desktop, and web — same layout, same tab bar,
                same scores from the shared backend.
              </p>
            </IosGroupedRow>
          </IosGroupedSection>
          <div className="px-4 space-y-3">
            <Link href="/analyze" className={buttonVariants({ className: "w-full h-12 rounded-xl text-[17px]" })}>
              Open app
            </Link>
            <Link
              href="/preview"
              className={buttonVariants({ variant: "outline", className: "w-full h-11 rounded-xl" })}
            >
              Fit Finder Preview
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
