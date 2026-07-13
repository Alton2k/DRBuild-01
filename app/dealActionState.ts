export type DealFormField =
  | "title"
  | "url"
  | "price"
  | "originalPrice"
  | "shippingCost"
  | "store"
  | "category"
  | "subCategory"
  | "expiresAt"
  | "description"
  | "imageName"
  | "imageUrl";

export interface DealActionState {
  ok: boolean;
  message: string;
  dealId?: string;
  dealStatus?: "pending" | "approved" | "rejected";
  errors?: Partial<Record<DealFormField, string>>;
}

export const initialDealActionState: DealActionState = {
  ok: false,
  message: "Fill in the deal details to submit it for moderation.",
};
