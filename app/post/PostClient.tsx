"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { checkDuplicateDealAction, createDealAction, type DuplicateDealCheckResult } from "../actions";
import { initialDealActionState } from "../dealActionState";
import FormContainer from "@/components/FormContainer";
import InputField from "@/components/InputField";
import SelectField from "@/components/SelectField";
import TextareaField from "@/components/TextareaField";
import UserImage from "@/components/UserImage";
import { detectDealCategory } from "@/lib/categoryDetection";
import { categoryOptions, getCategoryByName } from "@/lib/categories";

type DealFormState = {
  title: string;
  url: string;
  price: string;
  originalPrice: string;
  store: string;
  category: string;
  subCategory: string;
  description: string;
  imageName: string;
  imageUrl: string;
  uploadedImageUrl: string;
  optionalImageNames: string[];
  optionalImageUrls: string[];
  imageGalleryUrls: string[];
};

type FormErrors = Partial<Record<keyof DealFormState, string>>;
type ScrapeStatus = "idle" | "fetching" | "found" | "partial" | "failed";

type ScrapeData = {
  title: string;
  image: string;
  description: string;
  store?: string;
  price?: string;
};

type ScrapeSummary = {
  status: ScrapeStatus;
  applied: string[];
  missing: string[];
};

const initialFormState: DealFormState = {
  title: "",
  url: "",
  price: "",
  originalPrice: "",
  store: "Online",
  category: "",
  subCategory: "",
  description: "",
  imageName: "",
  imageUrl: "",
  uploadedImageUrl: "",
  optionalImageNames: [],
  optionalImageUrls: [],
  imageGalleryUrls: [],
};

const maxSourceImageBytes = 8_000_000;
const maxCompressedDataUrlLength = 110_000;
const maxImageDimension = 820;
const maxGalleryImages = 5;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not preview this image."));
    image.src = src;
  });
}

async function compressImage(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);

  if (originalDataUrl.length <= maxCompressedDataUrlLength) {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxImageDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not compress this image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.72, 0.62, 0.52, 0.42, 0.34, 0.28]) {
    const compressed = canvas.toDataURL("image/jpeg", quality);
    if (compressed.length <= maxCompressedDataUrlLength) {
      return compressed;
    }
  }

  return canvas.toDataURL("image/jpeg", 0.22);
}

const initialScrapeSummary: ScrapeSummary = {
  status: "idle",
  applied: [],
  missing: [],
};

const steps = ["Link", "Details", "Price", "Review"];
const stepDescriptions = [
  "Paste the product or promo link.",
  "Add the title, notes, and main image.",
  "Set pricing and category.",
  "Check everything before posting.",
];
const finalStep = steps.length - 1;

function formatReviewPrice(value: string) {
  const numberValue = Number(value);

  if (!value.trim() || Number.isNaN(numberValue) || numberValue <= 0) {
    return "-";
  }

  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function ReviewField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 15v4h14v-4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="m21 15-5-5L5 21" />
      <path d="m14 14-3-3-8 8" />
      <path d="M14 7h.01" />
    </svg>
  );
}

function SpinnerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} animate-spin`}
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function getSubmissionOutcome(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("published automatically")) {
    return {
      label: "Published automatically",
      title: "Your deal is live",
      description: "It passed the marketplace checks and is visible to shoppers now.",
      tone: "emerald",
    };
  }

  if (normalized.includes("duplicate")) {
    return {
      label: "Manual review",
      title: "Submitted with a duplicate warning",
      description: "Admins will compare it with the existing deal before deciding whether to publish it.",
      tone: "amber",
    };
  }

  return {
    label: "Waiting for moderation",
    title: "Your deal is in the review queue",
    description: "The deal was saved successfully and will appear once it is approved.",
    tone: "slate",
  };
}

function applyDetectedType(
  values: DealFormState,
  options: { categoryTouched: boolean; subCategoryTouched: boolean },
) {
  const detected = detectDealCategory([values.title, values.description, values.url]);
  if (!detected || (options.categoryTouched && options.subCategoryTouched)) {
    return { values, detectedLabel: "" };
  }

  const nextValues = {
    ...values,
    category: options.categoryTouched ? values.category : detected.category,
    subCategory: options.subCategoryTouched ? values.subCategory : detected.subCategory,
  };

  return {
    values: nextValues,
    detectedLabel: detected.subCategory
      ? `${detected.category} / ${detected.subCategory}`
      : detected.category,
  };
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getUrlHost(value: string) {
  try {
    return new URL(value.trim()).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function validateForm(
  values: DealFormState,
  options: { requireManualImage?: boolean } = {},
): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = "Add a deal title.";
  } else if (values.title.trim().length < 8) {
    errors.title = "Make the title more specific.";
  }

  if (!values.url.trim()) {
    errors.url = "Paste the deal URL.";
  } else if (!isValidUrl(values.url.trim())) {
    errors.url = "Use a full http:// or https:// URL.";
  }

  if (!values.price.trim()) {
    errors.price = "Add the deal price.";
  } else if (Number.isNaN(Number(values.price)) || Number(values.price) <= 0) {
    errors.price = "Price must be greater than 0.";
  }

  if (values.originalPrice.trim()) {
    const original = Number(values.originalPrice);
    const current = Number(values.price);
    if (Number.isNaN(original) || original <= 0) {
      errors.originalPrice = "Original price must be greater than 0.";
    } else if (values.price.trim() && original <= current) {
      errors.originalPrice = "Original price must be higher than deal price.";
    }
  }

  if (!values.category.trim()) {
    errors.category = "Choose a category.";
  }

  if (!values.description.trim()) {
    errors.description = "Add a short description.";
  } else if (values.description.trim().length < 20) {
    errors.description = "Add a little more detail.";
  }

  if (options.requireManualImage && !values.imageUrl.trim() && !values.uploadedImageUrl.trim()) {
    errors.imageName = "Add a product photo.";
  }

  return errors;
}

function validateStep(values: DealFormState, step: number) {
  const allErrors = validateForm(values);
  const fieldsByStep: Array<Array<keyof DealFormState>> = [
    ["url"],
    ["title", "description"],
    ["price", "originalPrice", "category"],
    [],
  ];
  const stepFields = fieldsByStep[step] ?? [];

  return Object.fromEntries(
    Object.entries(allErrors).filter(([field]) => stepFields.includes(field as keyof DealFormState)),
  ) as FormErrors;
}

function getFirstErrorStep(errors: FormErrors) {
  if (errors.url) return 0;
  if (errors.title || errors.description) return 1;
  if (errors.price || errors.originalPrice || errors.category) return 2;
  return finalStep;
}

function getDuplicateReasonLabel(reason: string) {
  if (reason === "Same deal URL after removing tracking parameters.") {
    return "Someone already posted this product. Try sharing a different deal.";
  }

  return reason;
}

async function fetchScrapeData(url: string) {
  const response = await fetch("/api/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || "Failed to fetch product details");
  }

  return response.json() as Promise<ScrapeData>;
}

export default function PostClient() {
  const [actionState, formAction, isPending] = useActionState(
    createDealAction,
    initialDealActionState,
  );
  const [form, setForm] = useState<DealFormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [imageLoadError, setImageLoadError] = useState("");
  const [lastFetchedUrl, setLastFetchedUrl] = useState("");
  const [scrapeData, setScrapeData] = useState<ScrapeData | null>(null);
  const [scrapeSummary, setScrapeSummary] = useState<ScrapeSummary>(initialScrapeSummary);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [subCategoryTouched, setSubCategoryTouched] = useState(false);
  const [detectedType, setDetectedType] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateDealCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const lastAutoAdvancedUrl = useRef("");
  const serverErrors = actionState.errors ?? {};
  const combinedErrors = { ...serverErrors, ...errors };
  const selectedCategory = getCategoryByName(form.category);
  const subCategoryOptions =
    selectedCategory?.subcategories.map((subcategory) => ({
      value: subcategory,
      label: subcategory,
    })) ?? [];
  const urlHost = getUrlHost(form.url);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleChange = (field: keyof DealFormState, value: string) => {
    const nextCategoryTouched = categoryTouched || field === "category";
    const nextSubCategoryTouched = subCategoryTouched || field === "subCategory";

    if (field === "category") {
      setCategoryTouched(true);
      setDetectedType("");
    }

    if (field === "subCategory") {
      setSubCategoryTouched(true);
      setDetectedType("");
    }

    if (field === "url") {
      setScrapeSummary(initialScrapeSummary);
      setScrapeData(null);
      setDuplicateCheck(null);
      setImageLoadError("");
    }

    if (field === "imageUrl" || field === "imageName" || field === "uploadedImageUrl") {
      setImageLoadError("");
    }

    if (field === "title" || field === "store") {
      setDuplicateCheck(null);
    }

    setForm((current) => {
      const nextValues = {
        ...current,
        [field]: value,
        ...(field === "category" ? { subCategory: "" } : {}),
      };

      if (field === "category" || field === "subCategory") {
        return nextValues;
      }

      const detected = applyDetectedType(nextValues, {
        categoryTouched: nextCategoryTouched,
        subCategoryTouched: nextSubCategoryTouched,
      });

      setDetectedType(detected.detectedLabel);
      return detected.values;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFetchError("");
  };

  const applyScrapedField = (field: "title" | "description" | "imageUrl") => {
    if (!scrapeData) return;

    const scrapedValue =
      field === "imageUrl"
        ? scrapeData.image
        : field === "title"
        ? scrapeData.title
        : scrapeData.description;

    if (!scrapedValue) return;

    setForm((current) => {
      const nextValues = { ...current, [field]: scrapedValue };
      const detected = applyDetectedType(nextValues, { categoryTouched, subCategoryTouched });
      setDetectedType(detected.detectedLabel);
      return detected.values;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "imageUrl") {
      setImageLoadError("");
    }
  };

  const handleScrapedImageError = () => {
    setForm((current) => ({ ...current, imageUrl: "" }));
    setScrapeSummary((current) => ({
      status: current.status === "failed" ? "failed" : "partial",
      applied: current.applied.filter((field) => field !== "image"),
      missing: current.missing.includes("image") ? current.missing : [...current.missing, "image"],
    }));
    setImageLoadError("Autofilled image could not be loaded. Please add an image manually before submitting.");
  };

  const runFetchDetails = useCallback(async (url: string) => {
    setFetchError("");
    setIsFetching(true);
    setScrapeSummary({ status: "fetching", applied: [], missing: [] });

    try {
      const data = await fetchScrapeData(url);
      const missing = [
        !data.image ? "image" : "",
      ].filter(Boolean);
      let detectedLabel = "";
      let appliedFields: string[] = [];

      setScrapeData(data);
      setImageLoadError("");
      setForm((current) => {
        const nextTitle = current.title;
        const nextDescription = current.description;
        const nextImageUrl = current.imageUrl || data.image;
        appliedFields = [
          !current.imageUrl && data.image ? "image" : "",
        ].filter(Boolean);

        const detected = applyDetectedType(
          {
            ...current,
            title: nextTitle,
            description: nextDescription,
            url,
            imageUrl: nextImageUrl,
          },
          { categoryTouched, subCategoryTouched },
        );

        detectedLabel = detected.detectedLabel;
        return { ...detected.values, url: current.url };
      });

      setDetectedType(detectedLabel);
      setErrors((current) => ({ ...current, title: undefined, description: undefined }));
      setLastFetchedUrl(url);
      setScrapeSummary({
        status: missing.length ? "partial" : "found",
        applied: appliedFields,
        missing,
      });
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Failed to fetch product details");
      setScrapeSummary({ status: "failed", applied: [], missing: [] });
    } finally {
      setIsFetching(false);
    }
  }, [categoryTouched, subCategoryTouched]);

  useEffect(() => {
    const url = form.url.trim();
    if (!url || !isValidUrl(url) || url === lastFetchedUrl) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runFetchDetails(url);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [form.url, lastFetchedUrl, runFetchDetails]);

  useEffect(() => {
    const url = form.url.trim();

    if (currentStep !== 0 || !isValidUrl(url) || url === lastAutoAdvancedUrl.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastAutoAdvancedUrl.current = url;
      setErrors((current) => ({ ...current, url: undefined }));
      setCurrentStep(1);
      scrollToTop();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [currentStep, form.url]);

  useEffect(() => {
    const title = form.title.trim();
    const url = form.url.trim();
    const store = form.store.trim();

    if (title.length < 8 || !isValidUrl(url) || !store) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const result = await checkDuplicateDealAction({ title, url, store });
        if (!cancelled) {
          setDuplicateCheck(result.match ? result : null);
        }
      } catch {
        if (!cancelled) {
          setDuplicateCheck(null);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingDuplicate(false);
        }
      }
    }, 750);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.title, form.url, form.store]);

  useEffect(() => {
    if (!actionState.message) return;

    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (actionState.ok) {
      setShowSuccessPanel(true);
      return;
    }

    if (!actionState.errors) return;

    const timer = window.setTimeout(() => {
      setCurrentStep(getFirstErrorStep(actionState.errors ?? {}));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [actionState.message, actionState.errors, actionState.ok, actionState.dealId]);

  useEffect(() => {
    if (!actionState.ok || !actionState.dealId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setForm(initialFormState);
      setErrors({});
      setCurrentStep(0);
      setFetchError("");
      setLastFetchedUrl("");
      setScrapeData(null);
      setScrapeSummary(initialScrapeSummary);
      setImageLoadError("");
      setDetectedType("");
      setDuplicateCheck(null);
      lastAutoAdvancedUrl.current = "";
      setCategoryTouched(false);
      setSubCategoryTouched(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [actionState.ok, actionState.dealId]);

  const handlePostAnother = () => {
    setShowSuccessPanel(false);
    setCurrentStep(0);
    scrollToTop();
  };

  const handleNext = () => {
    const validation = validateStep(form, currentStep);

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      scrollToTop();
      return;
    }

    setErrors({});
    window.setTimeout(() => {
      setCurrentStep((step) => Math.min(step + 1, finalStep));
      scrollToTop();
    }, 0);
  };

  const handleBack = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
    scrollToTop();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (currentStep < finalStep) {
      event.preventDefault();
      handleNext();
      return;
    }

    const validation = validateForm(form, { requireManualImage: true });

    if (Object.keys(validation).length > 0) {
      event.preventDefault();
      setErrors(validation);
      setCurrentStep(getFirstErrorStep(validation));
      scrollToTop();
    }
  };

  const handleProductImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      handleChange("imageName", "");
      handleChange("uploadedImageUrl", "");
      setForm((current) => ({ ...current, imageGalleryUrls: current.optionalImageUrls }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, imageName: "Choose an image file." }));
      return;
    }

    if (file.size > maxSourceImageBytes) {
      setErrors((current) => ({ ...current, imageName: "Choose an image under 8 MB." }));
      return;
    }

    setErrors((current) => ({ ...current, imageName: undefined }));

    try {
      const compressedImage = await compressImage(file);

      if (compressedImage.length > maxCompressedDataUrlLength) {
        setErrors((current) => ({
          ...current,
          imageName: "This image is still too large after compression.",
        }));
        return;
      }

      setForm((current) => ({
        ...current,
        imageName: file.name,
        uploadedImageUrl: compressedImage,
        imageGalleryUrls: [compressedImage, ...current.optionalImageUrls].slice(0, maxGalleryImages),
      }));
      setImageLoadError("");
    } catch (error) {
      setErrors((current) => ({
        ...current,
        imageName: error instanceof Error ? error.message : "Could not preview this image.",
      }));
    }
  };

  const handleOptionalImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, imageName: "Choose an image file." }));
      return;
    }

    if (file.size > maxSourceImageBytes) {
      setErrors((current) => ({ ...current, imageName: "Choose images under 8 MB each." }));
      return;
    }

    if (form.optionalImageUrls.length >= maxGalleryImages - 1) {
      setErrors((current) => ({
        ...current,
        imageName: `You can add up to ${maxGalleryImages - 1} optional photos.`,
      }));
      return;
    }

    setErrors((current) => ({ ...current, imageName: undefined }));

    try {
      const compressedImage = await compressImage(file);

      if (compressedImage.length > maxCompressedDataUrlLength) {
        setErrors((current) => ({
          ...current,
          imageName: "This image is still too large after compression.",
        }));
        return;
      }

      setForm((current) => {
        const optionalImageUrls = [...current.optionalImageUrls, compressedImage].slice(0, maxGalleryImages - 1);
        const optionalImageNames = [...current.optionalImageNames, file.name].slice(0, maxGalleryImages - 1);

        return {
          ...current,
          optionalImageUrls,
          optionalImageNames,
          imageGalleryUrls: [current.uploadedImageUrl, ...optionalImageUrls].filter(Boolean).slice(0, maxGalleryImages),
        };
      });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        imageName: error instanceof Error ? error.message : "Could not preview this image.",
      }));
    }
  };

  const currentPrice = Number(form.price);
  const originalPrice = Number(form.originalPrice);
  const discountAmount = originalPrice > currentPrice ? originalPrice - currentPrice : 0;
  const discountPercent = originalPrice > currentPrice ? Math.round((discountAmount / originalPrice) * 100) : 0;
  const discountLabel =
    originalPrice > currentPrice && discountAmount > 0 ? `${discountPercent}% off` : "";
  const canSubmit = !isPending && !isFetching;
  const successOutcome = getSubmissionOutcome(actionState.message);
  const canShowDuplicateCheck =
    form.title.trim().length >= 8 && isValidUrl(form.url) && Boolean(form.store.trim());
  const unavailableScrapedFields = [
    scrapeData?.title && form.title !== scrapeData.title ? "title" : "",
    scrapeData?.description && form.description !== scrapeData.description ? "description" : "",
    scrapeData?.image && form.imageUrl !== scrapeData.image ? "image" : "",
  ].filter(Boolean);
  const productImageUrl = form.imageUrl || form.uploadedImageUrl;
  const submittedImageUrl = form.uploadedImageUrl;
  const shouldShowProductUpload = !form.imageUrl;
  const submittedGalleryUrls = [productImageUrl, ...form.optionalImageUrls].filter(Boolean).slice(0, maxGalleryImages);
  const scrapeStatusLabel =
    scrapeSummary.status === "fetching"
      ? "Checking link..."
      : scrapeSummary.status === "failed"
      ? "Could not autofill."
      : scrapeSummary.status === "partial"
      ? "Some details were missing."
      : "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div ref={topRef} className="mx-auto max-w-5xl">
        <FormContainer
          title="Share your next great deal"
          description="Add the link, confirm the details, then submit for moderation."
        >
          <div className="space-y-6">
            {actionState.ok && showSuccessPanel ? (
              <section
                ref={messageRef}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                  successOutcome.tone === "emerald"
                    ? "border-emerald-200"
                    : successOutcome.tone === "amber"
                    ? "border-amber-200"
                    : "border-slate-200"
                }`}
                aria-live="polite"
              >
                <div
                  className={`border-b px-5 py-5 sm:px-6 ${
                    successOutcome.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : successOutcome.tone === "amber"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                          successOutcome.tone === "emerald"
                            ? "text-emerald-800"
                            : successOutcome.tone === "amber"
                            ? "text-amber-800"
                            : "text-slate-500"
                        }`}
                      >
                        {successOutcome.label}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        {successOutcome.title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                        {successOutcome.description}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        successOutcome.tone === "emerald"
                          ? "bg-emerald-600 text-white"
                          : successOutcome.tone === "amber"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-950 text-white"
                      }`}
                    >
                      <CheckIcon />
                    </span>
                  </div>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <p className="text-sm font-medium leading-6 text-slate-700">{actionState.message}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    {actionState.dealId ? (
                      <Link
                        href={`/deal/${actionState.dealId}`}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                      >
                        View deal
                        <ArrowRightIcon />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handlePostAnother}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                    >
                      Post another deal
                    </button>
                    <Link
                      href="/"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                    >
                      Go home
                    </Link>
                  </div>
                </div>
              </section>
            ) : actionState.message && actionState.message !== initialDealActionState.message && !actionState.ok ? (
              <div
                ref={messageRef}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-sm"
                aria-live="polite"
              >
                <p className="font-semibold">{actionState.errors ? "Fix these fields" : "Submission failed"}</p>
                <p className="mt-1">{actionState.message}</p>
              </div>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-2">
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {steps.map((step, index) => {
                  const isCurrent = index === currentStep;
                  const isComplete = index < currentStep;

                  return (
                    <li key={step}>
                      <div
                        className={`flex h-full items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                          isCurrent
                            ? "border-slate-900 bg-white text-slate-950 shadow-sm ring-1 ring-slate-900"
                            : isComplete
                            ? "border-emerald-200 bg-white text-slate-700"
                            : "border-transparent bg-transparent text-slate-500"
                        }`}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCurrent
                              ? "bg-slate-950 text-white"
                              : isComplete
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-300 bg-white text-slate-500"
                          }`}
                        >
                          {isComplete ? <CheckIcon /> : index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{step}</span>
                          <span className="mt-0.5 hidden text-xs leading-5 text-slate-500 sm:block">
                            {stepDescriptions[index]}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {currentStep === 0 ? (
              <section className="space-y-5">
                <InputField
                  id="deal-url"
                  name="url"
                  label="Deal URL"
                  type="url"
                  value={form.url}
                  placeholder="https://example.com/product"
                  required
                  hint={urlHost || "Product or promo page"}
                  error={combinedErrors.url}
                  disabled={isPending}
                  onChange={(value) => handleChange("url", value)}
                />

                {scrapeStatusLabel ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      scrapeSummary.status === "failed"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : scrapeSummary.status === "partial"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    }`}
                    aria-live="polite"
                  >
                    <p className="font-semibold">{scrapeStatusLabel}</p>
                    {scrapeSummary.missing.length ? (
                      <p className="mt-1">Missing: {scrapeSummary.missing.join(", ")}</p>
                    ) : null}
                  </div>
                ) : null}

                {fetchError ? <p className="text-sm text-rose-600">{fetchError}</p> : null}
              </section>
            ) : null}

            {currentStep === 1 ? (
              <section className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <InputField
                    id="deal-title"
                    name="title"
                    label="Deal Title"
                    value={form.title}
                    placeholder="Brand, item name, and key details"
                    required
                    error={combinedErrors.title}
                    disabled={isPending}
                    onChange={(value) => handleChange("title", value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextareaField
                    id="description"
                    name="description"
                    label="Description"
                    value={form.description}
                    placeholder="Voucher code, shipping, expiry, or product notes."
                    required
                    rows={5}
                    error={combinedErrors.description}
                    disabled={isPending}
                    onChange={(value) => handleChange("description", value)}
                  />
                </div>

                {unavailableScrapedFields.length ? (
                  <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Autofill options</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {scrapeData?.title && form.title !== scrapeData.title ? (
                        <button
                          type="button"
                          onClick={() => applyScrapedField("title")}
                          disabled={isPending}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          Title
                        </button>
                      ) : null}
                      {scrapeData?.description && form.description !== scrapeData.description ? (
                        <button
                          type="button"
                          onClick={() => applyScrapedField("description")}
                          disabled={isPending}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          Description
                        </button>
                      ) : null}
                      {scrapeData?.image && form.imageUrl !== scrapeData.image ? (
                        <button
                          type="button"
                          onClick={() => applyScrapedField("imageUrl")}
                          disabled={isPending}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          Image
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {imageLoadError ? (
                  <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {imageLoadError}
                  </div>
                ) : null}

                {form.imageUrl ? (
                  <div className="sm:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Image preview</p>
                      <button
                        type="button"
                        onClick={() => handleChange("imageUrl", "")}
                        disabled={isPending}
                        className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Remove
                      </button>
                    </div>
                    <UserImage
                      src={form.imageUrl}
                      alt="Fetched product preview"
                      className="mt-4 h-56 w-full rounded-2xl object-contain"
                      onError={handleScrapedImageError}
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section className="grid gap-6 sm:grid-cols-2">
                <InputField
                  id="price"
                  name="price"
                  label="Deal Price"
                  type="number"
                  value={form.price}
                  placeholder="RM"
                  required
                  inputMode="decimal"
                  error={combinedErrors.price}
                  disabled={isPending}
                  onChange={(value) => handleChange("price", value)}
                />

                <InputField
                  id="original-price"
                  name="originalPrice"
                  label="Original Price"
                  type="number"
                  value={form.originalPrice}
                  placeholder="RM"
                  inputMode="decimal"
                  error={combinedErrors.originalPrice}
                  extra={
                    discountLabel ? (
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900">
                        {discountLabel}
                      </div>
                    ) : null
                  }
                  disabled={isPending}
                  onChange={(value) => handleChange("originalPrice", value)}
                />

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-900">Availability</label>
                  <input type="hidden" name="store" value={form.store} />
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                    {["Online", "Offline"].map((option) => {
                      const selected = form.store === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleChange("store", option)}
                          disabled={isPending}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            selected
                              ? "bg-slate-950 text-white shadow-sm"
                              : "bg-transparent text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SelectField
                  id="category"
                  name="category"
                  label="Category"
                  value={form.category}
                  options={categoryOptions}
                  required
                  error={combinedErrors.category}
                  disabled={isPending}
                  onChange={(value) => handleChange("category", value)}
                />

                <SelectField
                  id="sub-category"
                  name="subCategory"
                  label="Sub Category"
                  value={form.subCategory}
                  options={subCategoryOptions}
                  hint={
                    form.category && subCategoryOptions.length === 0
                      ? "No sub category needed."
                      : undefined
                  }
                  disabled={isPending}
                  onChange={(value) => handleChange("subCategory", value)}
                />

                {detectedType ? (
                  <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Suggested: <span className="font-semibold">{detectedType}</span>
                  </div>
                ) : null}
              </section>
            ) : null}

            {currentStep === 3 ? (
              <form
                id="deal-review-form"
                action={formAction}
                onSubmit={handleSubmit}
                className="space-y-5"
                aria-busy={isPending}
              >
                {isPending ? (
                  <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm" aria-live="polite">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                        <SpinnerIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-slate-950">Submitting your deal</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          We are saving the deal, checking moderation status, and preparing the confirmation.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-950" />
                    </div>
                  </div>
                ) : null}

                {canShowDuplicateCheck && duplicateCheck?.match ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950" aria-live="polite">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">Possible duplicate</p>
                        <p className="mt-1 text-amber-900">{getDuplicateReasonLabel(duplicateCheck.match.reason)}</p>
                      </div>
                      <p className="text-sm font-medium text-amber-950 sm:max-w-sm sm:text-right">
                        {duplicateCheck.match.title}
                      </p>
                    </div>
                  </div>
                ) : canShowDuplicateCheck && isCheckingDuplicate ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600" aria-live="polite">
                    Checking duplicates...
                  </div>
                ) : null}

                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0 space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Review
                        </p>
                        <h2 className="mt-2 break-words text-2xl font-semibold text-slate-950">
                          {form.title || "Untitled deal"}
                        </h2>
                      </div>

                      <dl className="grid gap-4 sm:grid-cols-2">
                        <ReviewField label="Deal price" value={formatReviewPrice(form.price)} />
                        <ReviewField
                          label="Original price"
                          value={form.originalPrice ? formatReviewPrice(form.originalPrice) : "-"}
                        />
                        <ReviewField
                          label="Category"
                          value={form.subCategory ? `${form.category} / ${form.subCategory}` : form.category || "-"}
                        />
                        <ReviewField label="Store / availability" value={form.store || "-"} />
                        <ReviewField
                          label="Deal URL"
                          value={urlHost || "-"}
                          className="sm:col-span-2"
                        />
                        <ReviewField
                          label="Description"
                          value={form.description || "-"}
                          className="sm:col-span-2"
                        />
                      </dl>
                    </div>

                    <div className="space-y-3">
                      <div
                        className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm ${
                          combinedErrors.imageName || imageLoadError
                            ? "border-rose-200"
                            : "border-slate-200"
                        }`}
                      >
                        {form.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => handleChange("imageUrl", "")}
                            disabled={isPending}
                            aria-label="Remove autofilled image"
                            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                          >
                            <RemoveIcon />
                          </button>
                        ) : null}
                        <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 p-4">
                          {productImageUrl ? (
                            <UserImage
                              src={productImageUrl}
                              alt="Product photo preview"
                              className="h-full w-full rounded-xl object-contain"
                              onError={form.imageUrl ? handleScrapedImageError : undefined}
                            />
                          ) : (
                            <div className="flex flex-col items-center px-4 text-center text-slate-500">
                              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
                                <ImageIcon />
                              </span>
                              <p className="mt-3 text-sm font-semibold text-slate-700">
                                Product photo required
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Add a clear image of the item or promo.
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">Product photo</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {form.imageUrl ? "Autofilled from the link." : "Used as the deal thumbnail."}
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Required
                            </span>
                          </div>
                          {form.imageName ? (
                            <p className="mt-2 truncate text-xs text-slate-500">
                              {form.imageName}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {imageLoadError ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          The autofilled image could not be loaded. Upload a product photo manually to continue.
                        </div>
                      ) : null}

                      {combinedErrors.imageName ? (
                        <p className="text-sm font-medium text-rose-700">{combinedErrors.imageName}</p>
                      ) : null}

                      {shouldShowProductUpload ? (
                        <label
                          className={`flex min-h-[116px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center text-sm font-semibold transition focus-within:outline-none focus-within:ring-4 ${
                            combinedErrors.imageName
                              ? "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 focus-within:ring-rose-100"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-within:ring-slate-200"
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm">
                            <UploadIcon />
                          </span>
                          <span className="mt-3">{submittedImageUrl ? "Change photo" : "Upload product photo"}</span>
                          <span className="mt-1 text-xs font-medium text-slate-400">
                            Large images are handled automatically.
                          </span>
                          <input
                            name="productImageFile"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            aria-invalid={Boolean(combinedErrors.imageName)}
                            disabled={isPending}
                            onChange={handleProductImageChange}
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">Optional photos</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add extra angles or screenshots. Up to {maxGalleryImages - 1}.
                      </p>
                    </div>
                    {form.optionalImageUrls.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            optionalImageNames: [],
                            optionalImageUrls: [],
                            imageGalleryUrls: current.uploadedImageUrl ? [current.uploadedImageUrl] : [],
                          }));
                        }}
                        disabled={isPending}
                        className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
                      >
                        Remove all
                      </button>
                    ) : null}
                  </div>

                  {form.optionalImageUrls.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {form.optionalImageUrls.map((imageUrl, index) => (
                        <div key={`${imageUrl.slice(0, 32)}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => {
                              setForm((current) => {
                                const optionalImageUrls = current.optionalImageUrls.filter((_, photoIndex) => photoIndex !== index);
                                const optionalImageNames = current.optionalImageNames.filter((_, photoIndex) => photoIndex !== index);

                                return {
                                  ...current,
                                  optionalImageUrls,
                                  optionalImageNames,
                                  imageGalleryUrls: [current.uploadedImageUrl, ...optionalImageUrls].filter(Boolean).slice(0, maxGalleryImages),
                                };
                              });
                            }}
                            disabled={isPending}
                            aria-label={`Remove optional photo ${index + 1}`}
                            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                          >
                            <RemoveIcon />
                          </button>
                          <UserImage
                            src={imageUrl}
                            alt={`Optional deal preview ${index + 1}`}
                            className="aspect-[4/3] w-full object-contain p-2"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <label
                    className={`mt-4 flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm font-semibold transition focus-within:outline-none focus-within:ring-4 ${
                      combinedErrors.imageName
                        ? "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 focus-within:ring-rose-100"
                      : "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-white focus-within:ring-slate-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <UploadIcon />
                      Add optional photo
                    </span>
                    <span className="mt-1 text-xs font-medium text-slate-400">
                      Upload one at a time.
                    </span>
                    <input
                      name="optionalImageFile"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-invalid={Boolean(combinedErrors.imageName)}
                      disabled={isPending}
                      onChange={handleOptionalImageChange}
                    />
                  </label>
                  {combinedErrors.imageName ? (
                    <p className="mt-2 text-sm font-medium text-rose-700">{combinedErrors.imageName}</p>
                  ) : null}
                </section>

                <input type="hidden" name="title" value={form.title} />
                <input type="hidden" name="url" value={form.url} />
                <input type="hidden" name="price" value={form.price} />
                <input type="hidden" name="originalPrice" value={form.originalPrice} />
                <input type="hidden" name="store" value={form.store} />
                <input type="hidden" name="category" value={form.category} />
                <input type="hidden" name="subCategory" value={form.subCategory} />
                <input type="hidden" name="description" value={form.description} />
                <input type="hidden" name="imageUrl" value={form.imageUrl} />
                <input type="hidden" name="uploadedImageUrl" value={form.uploadedImageUrl} />
                <input type="hidden" name="imageGalleryUrls" value={JSON.stringify(submittedGalleryUrls)} />
              </form>
            ) : null}

            <div className="sticky bottom-0 z-10 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mx-0 sm:rounded-none sm:border-none sm:bg-transparent sm:px-0 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isPending}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>

                {currentStep < finalStep ? (
                  <button
                    key="next-step"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleNext();
                    }}
                    disabled={isFetching || isPending}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isFetching ? "Checking..." : "Next"}
                  </button>
                ) : (
                  <button
                    key="post-deal"
                    type="submit"
                    form="deal-review-form"
                    disabled={!canSubmit}
                    aria-busy={isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isPending ? (
                      <>
                        <SpinnerIcon />
                        Submitting deal
                      </>
                    ) : (
                      "Submit deal"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </FormContainer>
      </div>
    </main>
  );
}
