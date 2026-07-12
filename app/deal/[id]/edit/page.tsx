import { notFound, redirect } from "next/navigation";
import PostClient, { type DealFormInitialValues } from "@/app/post/PostClient";
import { getCurrentUser } from "@/lib/auth";
import { getDealById } from "@/lib/deals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Deal | Deal Rakyat",
  description: "Update a Deal Rakyat submission you own.",
};

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/auth?mode=login&next=${encodeURIComponent(`/deal/${id}/edit`)}`);
  }

  const deal = await getDealById(id);
  if (!deal || deal.authorUserId !== user.id) {
    notFound();
  }

  const primaryImage = deal.imageGalleryUrls[0] || deal.imageUrl || deal.uploadedImageUrl;
  const optionalImages = deal.imageGalleryUrls.filter((url) => url && url !== primaryImage).slice(0, 7);
  const initialValues: DealFormInitialValues = {
    title: deal.title,
    url: deal.url,
    price: String(deal.price),
    originalPrice: deal.originalPrice === null ? "" : String(deal.originalPrice),
    shippingMode: deal.hasFreeShipping ? "free" : "paid",
    shippingCost: deal.hasFreeShipping ? "" : String(deal.shippingCost ?? 0),
    store: deal.store,
    category: deal.category,
    subCategory: deal.subCategory ?? "",
    expirationMode: deal.expiredAt ? "set" : "none",
    expiresAt: toDateTimeLocal(deal.expiredAt),
    description: deal.description,
    imageName: primaryImage ? "Current product photo" : "",
    imageUrl: deal.imageUrl,
    uploadedImageUrl: deal.uploadedImageUrl,
    optionalImageNames: optionalImages.map((_, index) => `Current photo ${index + 2}`),
    optionalImageUrls: optionalImages,
    imageGalleryUrls: deal.imageGalleryUrls,
  };

  return <PostClient mode="edit" dealId={deal.id} initialValues={initialValues} draftScope={user.id} draftRevision={deal.updatedAt} />;
}
