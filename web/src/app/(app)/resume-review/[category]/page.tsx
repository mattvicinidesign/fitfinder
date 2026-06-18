import { ResumeReviewCategoryScreen } from "@/components/screens/resume-review-category-screen";
import { RESUME_REVIEW_CATEGORY_KEYS } from "@/lib/resume-review-categories";

export function generateStaticParams() {
  return RESUME_REVIEW_CATEGORY_KEYS.map((category) => ({ category }));
}

export default async function ResumeReviewCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <ResumeReviewCategoryScreen categoryKey={category} />;
}
