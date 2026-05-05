export type DealFormField =
  | "title"
  | "url"
  | "price"
  | "originalPrice"
  | "store"
  | "category"
  | "subCategory"
  | "description"
  | "imageUrl";

export interface DealActionState {
  ok: boolean;
  message: string;
  dealId?: string;
  errors?: Partial<Record<DealFormField, string>>;
}

export const initialDealActionState: DealActionState = {
  ok: false,
  message: "Fill in the deal details to submit it for moderation.",
};
