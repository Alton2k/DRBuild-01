import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PostClient from "./PostClient";

export const metadata = {
  title: "Post Deal | Deal Rakyat",
  description: "Submit a new deal listing with a clean, mobile-friendly form.",
};

export const dynamic = "force-dynamic";

/**
 * Renders the post-deal route by loading the interactive post form client component.
 */
export default async function PostDealPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth?mode=signup&next=/post");
  }

  return <PostClient draftScope={user.id} />;
}
