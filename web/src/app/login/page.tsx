import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-shell/app-frame";
import { LoginPageContent } from "@/app/login/login-page-content";
import { SIGNUP_PATH } from "@/lib/pending-signup";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  if (params.next === "/onboarding") {
    redirect(SIGNUP_PATH);
  }

  return (
    <AppFrame>
      <LoginPageContent />
    </AppFrame>
  );
}
