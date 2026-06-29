"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import UserImage from "@/components/UserImage";
import { detectDealCategory } from "@/lib/categoryDetection";
import { categoryOptions, getCategoryByName } from "@/lib/categories";
import { getDescriptionText, sanitizeDescriptionHtml } from "@/lib/description";
import { isProcessableDealUrl, validateDealUrl } from "@/lib/dealUrlSecurity";
import { dealTitleMaxCharacters, getDealTitleValidationError } from "@/lib/dealTitleValidation";
import { formatMyrPrice } from "@/lib/formatters";

type DealFormState = {
  title: string;
  url: string;
  price: string;
  originalPrice: string;
  shippingMode: string;
  shippingCost: string;
  store: string;
  category: string;
  subCategory: string;
  expirationMode: string;
  expiresAt: string;
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
  shippingMode: "paid",
  shippingCost: "",
  store: "Online",
  category: "",
  subCategory: "",
  expirationMode: "none",
  expiresAt: "",
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
const maxGalleryImages = 8;
const maxDescriptionImages = 10;

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

const steps = ["Link", "Details", "Description", "Price", "Review"];
const finalStep = steps.length - 1;

function countDescriptionImages(html: string) {
  return html.match(/<img\b/gi)?.length ?? 0;
}
function formatReviewPrice(value: string) {
  const numberValue = Number(value);

  if (!value.trim() || Number.isNaN(numberValue) || numberValue <= 0) {
    return "-";
  }

  return formatMyrPrice(numberValue);
}

function formatReviewShipping(mode: string, cost: string) {
  if (mode === "free") {
    return "Free shipping";
  }

  return cost.trim() ? formatReviewPrice(cost) : "-";
}

function formatReviewDateTime(value: string) {
  if (!value.trim()) {
    return "No expiry date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeInputValue(date: Date) {
  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
  ].join("T");
}

function parseDateTimeInputValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const parsed = new Date(year, month - 1, day, hour, minute);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();

  return [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
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

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function StepIcon({ step }: { step: number }) {
  const commonProps = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: "2.4",
  };

  if (step === 0) {
    return (
      <svg {...commonProps}>
        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
      </svg>
    );
  }

  if (step === 1) {
    return (
      <svg {...commonProps}>
        <path d="M4 5h16" />
        <path d="M4 12h10" />
        <path d="M4 19h7" />
        <path d="m15 17 2 2 4-4" />
      </svg>
    );
  }

  if (step === 2) {
    return (
      <svg {...commonProps}>
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h6" />
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function RichEditorIcon({ name }: { name: "bold" | "strike" | "italic" | "list" | "line" | "image" | "close" | "left" | "center" }) {
  const commonProps = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: "2.2",
  };

  if (name === "bold") {
    return (
      <svg {...commonProps}>
        <path d="M7 5h6a4 4 0 0 1 0 8H7z" />
        <path d="M7 13h7a4 4 0 0 1 0 8H7z" />
      </svg>
    );
  }

  if (name === "strike") {
    return (
      <svg {...commonProps}>
        <path d="M4 12h16" />
        <path d="M16 6.5A5 5 0 0 0 12 5c-2.2 0-4 1.1-4 3 0 1.2.7 2 1.8 2.5" />
        <path d="M8 17.5A5.4 5.4 0 0 0 12.2 19c2.4 0 4.3-1.1 4.3-3.1 0-1.3-.8-2.1-2-2.6" />
      </svg>
    );
  }

  if (name === "italic") {
    return (
      <svg {...commonProps}>
        <path d="M10 5h8" />
        <path d="M6 19h8" />
        <path d="m14 5-4 14" />
      </svg>
    );
  }

  if (name === "list") {
    return (
      <svg {...commonProps}>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    );
  }

  if (name === "line") {
    return (
      <svg {...commonProps}>
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...commonProps}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );
  }

  if (name === "left") {
    return (
      <svg {...commonProps}>
        <path d="M4 6h13" />
        <path d="M4 10h9" />
        <path d="M4 14h13" />
        <path d="M4 18h9" />
      </svg>
    );
  }

  if (name === "center") {
    return (
      <svg {...commonProps}>
        <path d="M6 6h12" />
        <path d="M8 10h8" />
        <path d="M6 14h12" />
        <path d="M8 18h8" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect width="18" height="16" x="3" y="4" rx="2" />
      <path d="m21 15-5-5L5 21" />
      <path d="m14 14-3-3-8 8" />
      <path d="M14 8h.01" />
    </svg>
  );
}

function RichDescriptionEditor({
  id,
  label,
  value,
  placeholder,
  error,
  required,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [activePopover, setActivePopover] = useState<"image" | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlignment, setImageAlignment] = useState<"left" | "center">("left");
  const describedBy = error ? `${id}-error` : undefined;
  const descriptionImageCount = countDescriptionImages(value);
  const imageLimitReached = descriptionImageCount >= maxDescriptionImages;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const clone = editor.cloneNode(true) as HTMLDivElement;
    clone.querySelectorAll("[data-editor-insertion-marker]").forEach((marker) => marker.remove());

    if (clone.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const removeInsertionMarker = () => {
    editorRef.current
      ?.querySelectorAll("[data-editor-insertion-marker]")
      .forEach((marker) => marker.remove());
  };

  const getEditorHtml = () => {
    const editor = editorRef.current;
    if (!editor) return "";

    const clone = editor.cloneNode(true) as HTMLDivElement;
    clone.querySelectorAll("[data-editor-insertion-marker]").forEach((marker) => marker.remove());
    return clone.innerHTML;
  };

  const syncEditorValue = () => {
    onChange(getEditorHtml());
  };

  const saveEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    if (savedSelectionRef.current && editor.contains(savedSelectionRef.current.commonAncestorContainer)) {
      selection.addRange(savedSelectionRef.current);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
  };

  const placeInsertionMarker = () => {
    const editor = editorRef.current;
    if (!editor) return;

    saveEditorSelection();
    removeInsertionMarker();

    const selection = window.getSelection();
    const activeRange =
      selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0).cloneRange()
        : null;
    const savedRange =
      savedSelectionRef.current && editor.contains(savedSelectionRef.current.commonAncestorContainer)
        ? savedSelectionRef.current.cloneRange()
        : null;
    const markerRange = activeRange ?? savedRange ?? document.createRange();

    if (!activeRange && !savedRange) {
      markerRange.selectNodeContents(editor);
      markerRange.collapse(false);
    }

    const marker = document.createElement("span");
    marker.dataset.editorInsertionMarker = "true";
    marker.contentEditable = "false";
    marker.style.display = "none";

    markerRange.deleteContents();
    markerRange.insertNode(marker);
    markerRange.setStartAfter(marker);
    markerRange.collapse(true);
    savedSelectionRef.current = markerRange.cloneRange();
  };

  const closeImagePopover = () => {
    removeInsertionMarker();
    setActivePopover(null);
  };

  const runEditorCommand = (command: string, commandValue?: string) => {
    restoreEditorSelection();
    document.execCommand(command, false, commandValue);
    syncEditorValue();
    saveEditorSelection();
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;

    restoreEditorSelection();
    document.execCommand("insertText", false, text);
    syncEditorValue();
    saveEditorSelection();
  };

  const insertImage = () => {
    const editor = editorRef.current;
    const trimmedUrl = imageUrl.trim();
    if (!editor || !trimmedUrl || countDescriptionImages(getEditorHtml()) >= maxDescriptionImages) return;

    const image = document.createElement("img");
    image.src = trimmedUrl;
    image.alt = "";
    image.className = `deal-description-image-${imageAlignment}`;

    const marker = editor.querySelector("[data-editor-insertion-marker]");
    const insertRange = document.createRange();
    const selection = window.getSelection();

    if (marker) {
      insertRange.setStartBefore(marker);
      marker.replaceWith(image);
    } else {
      restoreEditorSelection();
      const activeRange =
        selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
          ? selection.getRangeAt(0)
          : savedSelectionRef.current;
      insertRange.selectNodeContents(editor);
      if (activeRange) {
        insertRange.setStart(activeRange.startContainer, activeRange.startOffset);
        insertRange.setEnd(activeRange.endContainer, activeRange.endOffset);
        insertRange.deleteContents();
      } else {
        insertRange.collapse(false);
      }
      insertRange.insertNode(image);
    }

    insertRange.setStartAfter(image);
    insertRange.collapse(true);

    selection?.removeAllRanges();
    selection?.addRange(insertRange);
    savedSelectionRef.current = insertRange.cloneRange();
    syncEditorValue();
    setImageUrl("");
    setActivePopover(null);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-950">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      <div className={`post-rich-editor relative rounded-2xl border shadow-sm ${error ? "post-form-field-error" : ""}`}>
        <div className="post-rich-editor-toolbar flex flex-wrap gap-1 border-b p-2">
          <button
            type="button"
            onClick={() => runEditorCommand("bold")}
            disabled={disabled}
            aria-label="Bold"
            className="post-rich-editor-button inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RichEditorIcon name="bold" />
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("strikeThrough")}
            disabled={disabled}
            aria-label="Strikethrough"
            className="post-rich-editor-button inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RichEditorIcon name="strike" />
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("italic")}
            disabled={disabled}
            aria-label="Italic"
            className="post-rich-editor-button inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RichEditorIcon name="italic" />
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("insertUnorderedList")}
            disabled={disabled}
            aria-label="Bullet Point"
            className="post-rich-editor-button inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RichEditorIcon name="list" />
          </button>
          <button
            type="button"
            onClick={() => runEditorCommand("insertHorizontalRule")}
            disabled={disabled}
            aria-label="Breaker Line"
            className="post-rich-editor-button inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RichEditorIcon name="line" />
          </button>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              saveEditorSelection();
            }}
            onClick={() => {
              if (activePopover === "image") {
                closeImagePopover();
                return;
              }

              placeInsertionMarker();
              setActivePopover("image");
            }}
            disabled={disabled}
            aria-label="Image"
            aria-expanded={activePopover === "image"}
            className="post-rich-editor-button inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 data-[active=true]:bg-[#dc115e] data-[active=true]:text-white"
            data-active={activePopover === "image"}
          >
            <RichEditorIcon name="image" />
          </button>
        </div>
        {activePopover ? (
          <div className="post-rich-editor-popover absolute left-3 top-12 z-30 w-[min(320px,calc(100%-1.5rem))] rounded-2xl border p-3 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <p className="inline-flex items-center gap-2 text-base font-bold">
                <RichEditorIcon name={activePopover} />
                Insert image
              </p>
              <button
                type="button"
                onClick={closeImagePopover}
                aria-label="Close"
                className="post-rich-editor-button inline-flex h-8 w-8 items-center justify-center rounded-xl"
              >
                <RichEditorIcon name="close" />
              </button>
            </div>

            {activePopover === "image" ? (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span>Image from URL</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {descriptionImageCount}/{maxDescriptionImages}
                    </span>
                  </span>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="Image URL"
                    disabled={imageLimitReached}
                    autoComplete="off"
                    className="post-rich-editor-input mt-1.5 block h-10 w-full rounded-xl border px-3 text-sm outline-none"
                  />
                </label>
                {imageLimitReached ? (
                  <p className="theme-alert theme-alert-error px-3 py-2 text-sm font-semibold">
                    <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                      {"\u26A0"}
                    </span>
                    You can insert up to {maxDescriptionImages} images in the description.
                  </p>
                ) : null}
                <div>
                  <p className="text-sm font-bold">Alignment</p>
                  <div className="post-rich-editor-align-control mt-1.5 grid grid-cols-2 gap-1 rounded-full border p-1">
                    {[
                      { value: "left", label: "Left", icon: "left" },
                      { value: "center", label: "Center", icon: "center" },
                    ].map((option) => {
                      const selected = imageAlignment === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setImageAlignment(option.value as "left" | "center")}
                          className={`inline-flex h-9 items-center justify-center gap-2 rounded-full text-sm font-bold transition ${
                            selected ? "post-rich-editor-align-selected" : "post-rich-editor-align-idle"
                          }`}
                        >
                          <RichEditorIcon name={option.icon as "left" | "center"} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={insertImage}
                  disabled={!imageUrl.trim() || imageLimitReached}
                  className="post-rich-editor-insert-button inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add image
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          contentEditable={!disabled}
          data-placeholder={placeholder}
          onInput={() => {
            syncEditorValue();
            saveEditorSelection();
          }}
          onBlur={() => {
            saveEditorSelection();
            syncEditorValue();
          }}
          onKeyUp={saveEditorSelection}
          onMouseUp={saveEditorSelection}
          onFocus={saveEditorSelection}
          onPaste={handleEditorPaste}
          className="post-rich-editor-surface min-h-40 overflow-auto px-4 py-3 text-sm leading-6 outline-none"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-required={required}
        />
      </div>
      <div className="space-y-1 text-sm leading-5">
        {error ? (
          <p id={`${id}-error`} className="font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
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
      title: "Deal submitted successfully!",
      description: "",
      tone: "emerald",
    };
  }

  if (normalized.includes("duplicate")) {
    return {
      label: "Manual review",
      title: "Submitted with a duplicate warning",
      description: "",
      tone: "amber",
    };
  }

  return {
    label: "Waiting for moderation",
    title: "Your deal is now waiting to be review",
    description: "",
    tone: "slate",
  };
}

function applyDetectedType(
  values: DealFormState,
  options: { categoryTouched: boolean },
) {
  const detected = detectDealCategory([values.title, values.description, values.url]);
  if (!detected || options.categoryTouched) {
    return values;
  }

  const categoryChanged = values.category !== detected.category;
  return {
    ...values,
    category: detected.category,
    subCategory: categoryChanged ? "" : values.subCategory,
  };
}

function isValidUrl(value: string) {
  return isProcessableDealUrl(value);
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

  const titleError = getDealTitleValidationError(values.title);
  if (titleError) {
    errors.title = titleError === "Deal title is required." ? "Add a deal title." : titleError;
  }

  if (!values.url.trim()) {
    errors.url = "Paste the deal URL.";
  } else {
    const urlValidation = validateDealUrl(values.url);
    if (!urlValidation.ok) {
      errors.url = urlValidation.error;
    }
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

  if (values.shippingMode === "paid") {
    if (!values.shippingCost.trim()) {
      errors.shippingCost = "Add the shipping cost.";
    } else if (Number.isNaN(Number(values.shippingCost)) || Number(values.shippingCost) < 0) {
      errors.shippingCost = "Shipping cost must be 0 or more.";
    }
  }

  if (!values.category.trim()) {
    errors.category = "Choose a category.";
  } else {
    const category = getCategoryByName(values.category);
    if (category && category.subcategories.length > 0 && !values.subCategory.trim()) {
      errors.subCategory = "Choose a sub category.";
    }
  }

  if (values.expirationMode === "set") {
    if (!values.expiresAt.trim()) {
      errors.expiresAt = "Choose when this deal expires.";
    } else {
      const expiresAt = new Date(values.expiresAt);

      if (Number.isNaN(expiresAt.getTime())) {
        errors.expiresAt = "Choose a valid expiry date and time.";
      } else if (expiresAt.getTime() <= Date.now()) {
        errors.expiresAt = "Expiry should be in the future.";
      }
    }
  }

  const descriptionText = getDescriptionText(values.description);

  if (!descriptionText) {
    errors.description = "Add a short description.";
  } else if (descriptionText.length < 20) {
    errors.description = "Add a little more detail.";
  }

  if (options.requireManualImage && !values.imageUrl.trim() && !values.uploadedImageUrl.trim()) {
    errors.imageName = "Add a product photo.";
  }

  return errors;
}

function validateStep(values: DealFormState, step: number) {
  const allErrors = validateForm(values, { requireManualImage: step >= 1 });
  const fieldsByStep: Array<Array<keyof DealFormState>> = [
    ["url"],
    ["title", "imageName"],
    ["description"],
    ["price", "originalPrice", "shippingCost", "category", "subCategory", "expiresAt"],
    [],
  ];
  const stepFields = fieldsByStep[step] ?? [];

  return Object.fromEntries(
    Object.entries(allErrors).filter(([field]) => stepFields.includes(field as keyof DealFormState)),
  ) as FormErrors;
}

function getFirstErrorStep(errors: FormErrors) {
  if (errors.url) return 0;
  if (errors.title || errors.imageName) return 1;
  if (errors.description) return 2;
  if (errors.price || errors.originalPrice || errors.shippingCost || errors.category || errors.subCategory || errors.expiresAt) return 3;
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
  const router = useRouter();
  const [actionState, formAction, isPending] = useActionState(
    createDealAction,
    initialDealActionState,
  );
  const [form, setForm] = useState<DealFormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedUrl, setLastFetchedUrl] = useState("");
  const [scrapeSummary, setScrapeSummary] = useState<ScrapeSummary>(initialScrapeSummary);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateDealCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [draftExpiresAt, setDraftExpiresAt] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false);
  const [activeReviewPhotoIndex, setActiveReviewPhotoIndex] = useState(0);
  const messageRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const expirationPickerRef = useRef<HTMLDivElement>(null);
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
  const productImageUrl = form.imageUrl || form.uploadedImageUrl;
  const submittedGalleryUrls = [productImageUrl, ...form.optionalImageUrls].filter(Boolean).slice(0, maxGalleryImages);
  const activeReviewPhotoUrl =
    submittedGalleryUrls[Math.min(activeReviewPhotoIndex, Math.max(0, submittedGalleryUrls.length - 1))] ?? productImageUrl;
  const galleryImageCount = (productImageUrl ? 1 : 0) + form.optionalImageUrls.length;
  const canAddGalleryImage = galleryImageCount < maxGalleryImages;
  const visibleGallerySlots = Math.min(maxGalleryImages, Math.max(6, galleryImageCount + 1));
  const renderedGalleryBaseSlots = productImageUrl ? galleryImageCount : 1;
  const remainingVisibleGallerySlots = Math.max(0, visibleGallerySlots - renderedGalleryBaseSlots);
  const showReviewPhotoControls = submittedGalleryUrls.length > 1;

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleChange = (field: keyof DealFormState, value: string) => {
    const nextCategoryTouched = categoryTouched || field === "category";

    if (field === "category") {
      setCategoryTouched(true);
    }

    if (field === "url") {
      setScrapeSummary(initialScrapeSummary);
      setDuplicateCheck(null);
    }

    if (field === "expirationMode" && value === "none") {
      setShowExpirationPicker(false);
      setDraftExpiresAt("");
    }

    if (field === "title" || field === "store") {
      setDuplicateCheck(null);
    }

    setForm((current) => {
      const nextValues = {
        ...current,
        [field]: value,
        ...(field === "category" ? { subCategory: "" } : {}),
        ...(field === "expirationMode" && value === "none" ? { expiresAt: "" } : {}),
        ...(field === "shippingMode" && value === "free" ? { shippingCost: "" } : {}),
      };

      if (field === "category" || field === "subCategory") {
        return nextValues;
      }

      const detected = applyDetectedType(nextValues, {
        categoryTouched: nextCategoryTouched,
      });

      return detected;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleScrapedImageError = () => {
    setForm((current) => ({ ...current, imageUrl: "" }));
    setScrapeSummary((current) => ({
      status: current.status === "failed" ? "failed" : "partial",
      applied: current.applied.filter((field) => field !== "image"),
      missing: current.missing.includes("image") ? current.missing : [...current.missing, "image"],
    }));
  };

  const clearPostImages = useCallback(() => {
    setForm((current) => ({
      ...current,
      imageName: "",
      imageUrl: "",
      uploadedImageUrl: "",
      optionalImageNames: [],
      optionalImageUrls: [],
      imageGalleryUrls: [],
    }));
    setActiveReviewPhotoIndex(0);
    setScrapeSummary((current) => ({
      ...current,
      applied: current.applied.filter((field) => field !== "image"),
      missing: current.missing.filter((field) => field !== "image"),
    }));
  }, []);

  const runFetchDetails = useCallback(async (url: string) => {
    setIsFetching(true);
    setScrapeSummary({ status: "fetching", applied: [], missing: [] });

    try {
      const data = await fetchScrapeData(url);
      const missing = [
        !data.image ? "image" : "",
      ].filter(Boolean);
      let appliedFields: string[] = [];

      setForm((current) => {
        const nextTitle = current.title;
        const nextDescription = current.description;
        const nextImageUrl = current.imageUrl || data.image;
        appliedFields = [
          !current.imageUrl && data.image ? "image" : "",
        ].filter(Boolean);

        const detectedValues = applyDetectedType(
          {
            ...current,
            title: nextTitle,
            description: nextDescription,
            url,
            imageUrl: nextImageUrl,
          },
          { categoryTouched },
        );

        return { ...detectedValues, url: current.url };
      });

      setErrors((current) => ({ ...current, title: undefined, description: undefined }));
      setLastFetchedUrl(url);
      setScrapeSummary({
        status: missing.length ? "partial" : "found",
        applied: appliedFields,
        missing,
      });
    } catch {
      setScrapeSummary({ status: "failed", applied: [], missing: [] });
    } finally {
      if (form.url.trim() === url && lastAutoAdvancedUrl.current !== url) {
        const duplicateResult = await checkDuplicateDealAction({
          title: form.title.trim(),
          url,
          store: form.store.trim() || "Online",
        });

        if (duplicateResult.match) {
          setDuplicateCheck(duplicateResult);
          setIsFetching(false);
          return;
        }

        lastAutoAdvancedUrl.current = url;
        setErrors((current) => ({ ...current, url: undefined }));
        setCurrentStep((step) => (step === 0 ? 1 : step));
        scrollToTop();
      }
      setIsFetching(false);
    }
  }, [categoryTouched, form.store, form.title, form.url]);

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
    const handlePageHide = () => {
      clearPostImages();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      clearPostImages();
    };
  }, [clearPostImages]);

  useEffect(() => {
    const title = form.title.trim();
    const url = form.url.trim();
    const store = form.store.trim() || "Online";

    if (!isValidUrl(url)) {
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
      setLastFetchedUrl("");
      setScrapeSummary(initialScrapeSummary);
      setDuplicateCheck(null);
      lastAutoAdvancedUrl.current = "";
      setCategoryTouched(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [actionState.ok, actionState.dealId]);

  useEffect(() => {
    if (activeReviewPhotoIndex < submittedGalleryUrls.length) {
      return;
    }

    setActiveReviewPhotoIndex(Math.max(0, submittedGalleryUrls.length - 1));
  }, [activeReviewPhotoIndex, submittedGalleryUrls.length]);

  useEffect(() => {
    if (!showExpirationPicker) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || expirationPickerRef.current?.contains(target)) {
        return;
      }

      setShowExpirationPicker(false);
      setDraftExpiresAt("");
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showExpirationPicker]);

  useEffect(() => {
    if (!isDiscardPromptOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDiscardPromptOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDiscardPromptOpen]);

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

    if (currentStep === 0 && isCheckingDuplicate) {
      scrollToTop();
      return;
    }

    if (currentStep === 0 && duplicateCheck?.match) {
      setErrors((current) => ({
        ...current,
        url: "This deal already exists.",
      }));
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

  const handleDiscard = () => {
    setIsDiscardPromptOpen(true);
  };

  const confirmDiscard = () => {
    setIsDiscardPromptOpen(false);
    clearPostImages();
    router.push("/");
  };

  const openExpirationPicker = () => {
    const selectedDate = parseDateTimeInputValue(form.expiresAt);

    setDraftExpiresAt(form.expiresAt);
    setCalendarMonth(selectedDate ?? new Date());
    setShowExpirationPicker((current) => !current);
  };

  const updateExpirationDate = (day: number) => {
    const current = parseDateTimeInputValue(draftExpiresAt);
    const next = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
      current?.getHours() ?? 9,
      current?.getMinutes() ?? 0,
    );

    setDraftExpiresAt(formatDateTimeInputValue(next));
  };

  const updateExpirationTime = (hour: number, minute: number) => {
    const current = parseDateTimeInputValue(draftExpiresAt) ?? new Date();
    const next = new Date(current);

    next.setHours(hour, minute, 0, 0);
    setDraftExpiresAt(formatDateTimeInputValue(next));
  };

  const saveExpirationDraft = () => {
    handleChange("expiresAt", draftExpiresAt);
    setShowExpirationPicker(false);
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
  const hasDuplicateMatch = Boolean(duplicateCheck?.match);
  const canSubmit = !isPending && !isFetching && !hasDuplicateMatch;
  const successOutcome = getSubmissionOutcome(actionState.message);
  const canViewSubmittedDeal = actionState.dealStatus === "approved" && Boolean(actionState.dealId);
  const canShowDuplicateCheck = isValidUrl(form.url);
  const activeExpirationValue = showExpirationPicker ? draftExpiresAt : form.expiresAt;
  const selectedExpirationDate = parseDateTimeInputValue(activeExpirationValue);
  const calendarDays = getCalendarDays(calendarMonth);
  const calendarMonthLabel = new Intl.DateTimeFormat("en-MY", {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);
  const selectedHour = selectedExpirationDate?.getHours() ?? 9;
  const selectedMinute = selectedExpirationDate?.getMinutes() ?? 0;
  const linkCheckingLabel =
    scrapeSummary.status === "fetching" || (currentStep === 0 && isCheckingDuplicate)
      ? "Checking..."
      : "";

  return (
    <main className="post-page min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div ref={topRef} className="mx-auto max-w-5xl">
        <FormContainer
          title="Share your next great deal"
          description="Add the link, confirm the details, then submit for moderation."
        >
          <div className="space-y-6">
            {actionState.ok && showSuccessPanel ? (
              <section
                ref={messageRef}
                className="post-success-overlay fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
                aria-live="polite"
              >
                <div
                  className={`post-success-panel w-full max-w-xl ${
                    successOutcome.tone === "amber" ? "post-success-panel-review" : ""
                  }`}
                >
                <div className="px-6 py-6 sm:px-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="post-success-kicker text-xs font-bold uppercase tracking-[0.24em]">
                        {successOutcome.label}
                      </p>
                      <h2 className="post-success-title mt-2 text-2xl font-bold tracking-tight">
                        {successOutcome.title}
                      </h2>
                      {successOutcome.description ? (
                        <p className="post-success-copy mt-2 max-w-2xl text-sm leading-6">
                          {successOutcome.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="post-success-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <CheckIcon />
                    </span>
                  </div>
                </div>
                <div className="post-success-actions px-6 pb-6 pt-4 sm:px-7">
                  <div
                    className={`grid gap-3.5 sm:items-center ${
                      canViewSubmittedDeal ? "sm:grid-cols-3" : "sm:grid-cols-2"
                    }`}
                  >
                    {canViewSubmittedDeal ? (
                      <Link
                        href={`/deal/${actionState.dealId}`}
                        className="post-success-primary-action inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
                      >
                        View deal
                        <ArrowRightIcon />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handlePostAnother}
                      className="post-secondary-button inline-flex h-12 w-full items-center justify-center rounded-full border px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
                    >
                      Post another deal
                    </button>
                    <Link
                      href="/"
                      className="post-secondary-button inline-flex h-12 w-full items-center justify-center rounded-full border px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
                    >
                      Go home
                    </Link>
                  </div>
                </div>
                </div>
              </section>
            ) : actionState.message && actionState.message !== initialDealActionState.message && !actionState.ok ? (
              <div
                ref={messageRef}
                className="theme-alert theme-alert-error px-5 py-4 text-sm"
                aria-live="polite"
              >
                <p className="font-semibold">
                  <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                    {"\u26A0"}
                  </span>
                  {actionState.errors ? "Fix these fields" : "Submission failed"}
                </p>
                <p className="mt-1">{actionState.message}</p>
              </div>
            ) : null}

            <div className="post-stepper">
              <ol className="grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-5">
                {steps.map((step, index) => {
                  const isCurrent = index === currentStep;
                  const isComplete = index < currentStep;

                  return (
                    <li key={step}>
                      <div
                        className={`flex h-full w-full max-w-[11.5rem] items-center justify-center gap-3 rounded-full border px-4 py-3 transition ${
                          isCurrent
                            ? "post-step-current"
                            : isComplete
                            ? "post-step-complete"
                            : "border-transparent bg-transparent text-slate-500"
                        }`}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isCurrent
                              ? "bg-[#dc115e] text-white"
                              : isComplete
                              ? "post-step-complete-icon"
                              : "post-step-idle-icon"
                          }`}
                        >
                          {isComplete ? <CheckIcon /> : <StepIcon step={index} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[0.95rem] font-semibold leading-none">{step}</span>
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

                {linkCheckingLabel ? (
                  <div
                    className="post-loading-status py-3 text-center text-sm font-medium"
                    aria-live="polite"
                  >
                    <div className="inline-flex items-center justify-center gap-2">
                      <span className="post-loading-mini-spinner" aria-hidden="true" />
                      {linkCheckingLabel}
                    </div>
                    <div className="post-loading-track mx-auto mt-3">
                      <div className="post-loading-bar" />
                    </div>
                  </div>
                ) : null}

                {canShowDuplicateCheck && duplicateCheck?.match ? (
                  <div className="post-inline-warning px-3 py-3 text-sm" aria-live="polite">
                    <p className="font-semibold">
                      <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                        {"\u26A0"}
                      </span>
                      Possible duplicate
                    </p>
                    <p className="mt-1">{getDuplicateReasonLabel(duplicateCheck.match.reason)}</p>
                  </div>
                ) : null}
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
                    maxLength={dealTitleMaxCharacters}
                    error={combinedErrors.title}
                    disabled={isPending}
                    onChange={(value) => handleChange("title", value)}
                  />
                </div>

                <div className="post-photo-section sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Product photo</p>
                      <p className="mt-1 text-xs text-slate-500">Used as the deal thumbnail.</p>
                    </div>
                    <span className="post-review-pill rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Required
                    </span>
                  </div>

                  <div className="post-gallery-shell mt-5">
                    <div className="post-gallery-grid">
                      {productImageUrl ? (
                        <div className="post-gallery-slot post-gallery-slot-primary relative">
                          <button
                            type="button"
                            onClick={() => {
                              handleChange("imageUrl", "");
                              handleChange("uploadedImageUrl", "");
                              handleChange("imageName", "");
                            }}
                            disabled={isPending}
                            aria-label="Remove product image"
                            className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                          >
                            <RemoveIcon />
                          </button>
                          <UserImage
                            src={productImageUrl}
                            alt="Product photo preview"
                            className="h-full w-full object-contain"
                            onError={form.imageUrl ? handleScrapedImageError : undefined}
                          />
                        </div>
                      ) : (
                        <label
                          className={`post-gallery-slot post-gallery-upload post-gallery-slot-primary ${
                            combinedErrors.imageName ? "post-upload-zone-error" : ""
                          }`}
                        >
                          <span className="post-gallery-plus" aria-hidden="true">
                            +
                          </span>
                          <span className="sr-only">Upload product photo</span>
                          <input
                            name="productImageFileDetails"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            aria-invalid={Boolean(combinedErrors.imageName)}
                            disabled={isPending}
                            onChange={handleProductImageChange}
                          />
                        </label>
                      )}

                      {form.optionalImageUrls.map((imageUrl, index) => (
                        <div key={`${imageUrl.slice(0, 32)}-${index}`} className="post-gallery-slot relative">
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
                            aria-label={`Remove product photo ${index + 2}`}
                            className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                          >
                            <RemoveIcon />
                          </button>
                          <UserImage
                            src={imageUrl}
                            alt={`Product photo ${index + 2}`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ))}

                      {Array.from({ length: remainingVisibleGallerySlots }).map((_, index) => {
                        const isFirstEmptySlot = index === 0;

                        if (!productImageUrl || !canAddGalleryImage || !isFirstEmptySlot) {
                          return (
                            <div
                              key={`empty-photo-slot-${index}`}
                              className="post-gallery-slot post-gallery-empty"
                              aria-hidden="true"
                            />
                          );
                        }

                        return (
                          <label
                            key={`add-photo-slot-${index}`}
                            className={`post-gallery-slot post-gallery-upload ${
                              combinedErrors.imageName ? "post-upload-zone-error" : ""
                            }`}
                          >
                            <span className="post-gallery-plus" aria-hidden="true">
                              +
                            </span>
                            <span className="sr-only">
                              {productImageUrl ? "Add product photo" : "Upload product photo"}
                            </span>
                            <input
                              name={productImageUrl ? "optionalImageFileDetails" : "productImageFileDetails"}
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              aria-invalid={Boolean(combinedErrors.imageName)}
                              disabled={isPending}
                              onChange={productImageUrl ? handleOptionalImageChange : handleProductImageChange}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-medium text-slate-500">
                    Upload up to {maxGalleryImages} photos. The first photo is used as the thumbnail.
                  </p>

                  {combinedErrors.imageName ? (
                    <p className="mt-2 text-sm font-medium text-rose-700">{combinedErrors.imageName}</p>
                  ) : null}
                </div>

              </section>
            ) : null}

            {currentStep === 2 ? (
              <section className="grid gap-6">
                <RichDescriptionEditor
                  id="description"
                  label="Description"
                  value={form.description}
                  placeholder="Voucher code, shipping, expiry, or product notes."
                  required
                  error={combinedErrors.description}
                  disabled={isPending}
                  onChange={(value) => handleChange("description", value)}
                />
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section className="grid gap-6 sm:grid-cols-2">
                <InputField
                  id="price"
                  name="price"
                  label="Deal Price"
                  type="text"
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
                  type="text"
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
                  <label className="block text-sm font-semibold text-slate-900">Shipping</label>
                  <div className="post-segmented-control grid grid-cols-2 gap-2 rounded-2xl border p-1">
                    {[
                      { value: "free", label: "Free" },
                      { value: "paid", label: "Set cost" },
                    ].map((option) => {
                      const selected = form.shippingMode === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChange("shippingMode", option.value)}
                          disabled={isPending}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            selected
                              ? "post-segmented-control-selected shadow-sm"
                              : "post-segmented-control-idle"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.shippingMode === "paid" ? (
                  <InputField
                    id="shipping-cost"
                    name="shippingCost"
                    label="Shipping Cost"
                    type="text"
                    value={form.shippingCost}
                    placeholder="RM"
                    inputMode="decimal"
                    error={combinedErrors.shippingCost}
                    disabled={isPending}
                    onChange={(value) => handleChange("shippingCost", value)}
                  />
                ) : null}

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-900">Availability</label>
                  <input type="hidden" name="store" value={form.store} />
                  <div className="post-segmented-control grid grid-cols-2 gap-2 rounded-2xl border p-1">
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
                              ? "post-segmented-control-selected shadow-sm"
                              : "post-segmented-control-idle"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-900">Expiration</label>
                  <div className="post-segmented-control grid grid-cols-2 gap-2 rounded-2xl border p-1">
                    {[
                      { value: "none", label: "No expiry" },
                      { value: "set", label: "Set expiry" },
                    ].map((option) => {
                      const selected = form.expirationMode === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChange("expirationMode", option.value)}
                          disabled={isPending}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            selected
                              ? "post-segmented-control-selected shadow-sm"
                              : "post-segmented-control-idle"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.expirationMode === "set" ? (
                  <div className="space-y-2">
                    <label htmlFor="expires-at-button" className="block text-sm font-semibold text-slate-950">
                      Expiry Date
                    </label>
                    <div ref={expirationPickerRef} className="relative">
                      <div
                        className={`post-date-picker flex h-12 items-center overflow-hidden rounded-2xl border text-sm shadow-sm ${
                          combinedErrors.expiresAt ? "post-form-field-error" : ""
                        }`}
                      >
                        <span
                          className={`min-w-0 flex-1 truncate px-4 ${
                            form.expiresAt ? "font-semibold" : "text-slate-500"
                          }`}
                        >
                          {form.expiresAt ? formatReviewDateTime(form.expiresAt) : "dd/mm/yyyy"}
                        </span>
                        <button
                          id="expires-at-button"
                          type="button"
                          onClick={openExpirationPicker}
                          disabled={isPending}
                          aria-label="Choose expiry date"
                          aria-expanded={showExpirationPicker}
                          className="post-date-picker-button flex h-full w-12 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <CalendarIcon />
                        </button>
                      </div>

                      {showExpirationPicker ? (
                        <div className="post-calendar-popover absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 rounded-2xl border p-4 shadow-2xl">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                              }}
                              className="post-calendar-icon-button"
                              aria-label="Previous month"
                            >
                              <span aria-hidden="true">‹</span>
                            </button>
                            <p className="text-sm font-bold">{calendarMonthLabel}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                              }}
                              className="post-calendar-icon-button"
                              aria-label="Next month"
                            >
                              <span aria-hidden="true">›</span>
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayLabel) => (
                              <span key={dayLabel}>{dayLabel}</span>
                            ))}
                          </div>

                          <div className="mt-2 grid grid-cols-7 gap-1">
                            {calendarDays.map((day, index) =>
                              day ? (
                                <button
                                  key={`${calendarMonthLabel}-${day}`}
                                  type="button"
                                  onClick={() => updateExpirationDate(day)}
                                  className="post-calendar-day"
                                  aria-pressed={
                                    selectedExpirationDate?.getFullYear() === calendarMonth.getFullYear() &&
                                    selectedExpirationDate?.getMonth() === calendarMonth.getMonth() &&
                                    selectedExpirationDate?.getDate() === day
                                  }
                                >
                                  {day}
                                </button>
                              ) : (
                                <span key={`blank-${index}`} />
                              ),
                            )}
                          </div>

                          <div className="post-calendar-time-panel mt-4 rounded-2xl border p-3">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Time</p>
                            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                              <label className="sr-only" htmlFor="expiry-hour">
                                Expiry hour
                              </label>
                              <select
                                id="expiry-hour"
                                value={padDatePart(selectedHour)}
                                onChange={(event) => updateExpirationTime(Number(event.target.value), selectedMinute)}
                                className="post-calendar-time-select h-11 rounded-xl border px-3 text-sm font-bold outline-none transition"
                              >
                                {Array.from({ length: 24 }, (_, hour) => (
                                  <option key={hour} value={padDatePart(hour)}>
                                    {padDatePart(hour)}
                                  </option>
                                ))}
                              </select>
                              <span className="text-sm font-bold text-slate-400">:</span>
                              <label className="sr-only" htmlFor="expiry-minute">
                                Expiry minute
                              </label>
                              <select
                                id="expiry-minute"
                                value={padDatePart(selectedMinute)}
                                onChange={(event) => updateExpirationTime(selectedHour, Number(event.target.value))}
                                className="post-calendar-time-select h-11 rounded-xl border px-3 text-sm font-bold outline-none transition"
                              >
                                {[0, 15, 30, 45].map((minute) => (
                                  <option key={minute} value={padDatePart(minute)}>
                                    {padDatePart(minute)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setDraftExpiresAt("")}
                              className="post-calendar-text-button"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={saveExpirationDraft}
                              className="post-calendar-done-button"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm leading-5">
                      {combinedErrors.expiresAt ? (
                        <p id="expires-at-error" className="font-semibold text-rose-700">
                          {combinedErrors.expiresAt}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

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
                  required={subCategoryOptions.length > 0}
                  hint={
                    form.category && subCategoryOptions.length === 0
                      ? "No sub category needed."
                      : undefined
                  }
                  error={combinedErrors.subCategory}
                  disabled={isPending}
                  onChange={(value) => handleChange("subCategory", value)}
                />
              </section>
            ) : null}

            {currentStep === 4 ? (
              <form
                id="deal-review-form"
                action={formAction}
                onSubmit={handleSubmit}
                autoComplete="off"
                className="space-y-5"
                aria-busy={isPending}
              >
                {isPending ? (
                  <div className="post-loading-status py-4" aria-live="polite">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div>
                        <p className="post-loading-title text-base font-semibold">Submitting deal</p>
                        <p className="post-loading-copy mt-1 text-sm leading-6">
                          Saving details, checking moderation, and preparing confirmation.
                        </p>
                      </div>
                      <div className="post-loading-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                    <div className="post-loading-track mx-auto mt-4">
                      <div className="post-loading-bar" />
                    </div>
                  </div>
                ) : null}

                {canShowDuplicateCheck && duplicateCheck?.match ? (
                  <div className="post-inline-warning px-1 py-2 text-sm" aria-live="polite">
                    <div className="flex flex-col items-center gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                            {"\u26A0"}
                          </span>
                          Possible duplicate
                        </p>
                        <p className="mt-1">{getDuplicateReasonLabel(duplicateCheck.match.reason)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <section className="post-preview-panel rounded-3xl border p-4 sm:p-6">
                  <article>
                    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="post-preview-canvas post-review-image-frame relative flex min-h-[260px] flex-col justify-center rounded-xl p-5">
                        {form.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => handleChange("imageUrl", "")}
                            disabled={isPending}
                            aria-label="Remove product image"
                            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                          >
                            <RemoveIcon />
                          </button>
                        ) : null}
                        {activeReviewPhotoUrl ? (
                          <>
                            {showReviewPhotoControls ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveReviewPhotoIndex((current) =>
                                      current === 0 ? submittedGalleryUrls.length - 1 : current - 1,
                                    );
                                  }}
                                  className="post-review-gallery-arrow left-2"
                                  aria-label="Previous review photo"
                                >
                                  <span aria-hidden="true">{"<"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveReviewPhotoIndex((current) =>
                                      current >= submittedGalleryUrls.length - 1 ? 0 : current + 1,
                                    );
                                  }}
                                  className="post-review-gallery-arrow right-2"
                                  aria-label="Next review photo"
                                >
                                  <span aria-hidden="true">{">"}</span>
                                </button>
                              </>
                            ) : null}
                            <UserImage
                              src={activeReviewPhotoUrl}
                              alt="Product photo preview"
                              className="max-h-52 w-full rounded-lg object-contain"
                              onError={activeReviewPhotoIndex === 0 && form.imageUrl ? handleScrapedImageError : undefined}
                            />
                            {submittedGalleryUrls.length > 1 ? (
                              <div className="post-review-gallery mt-4 grid w-full grid-cols-4 gap-2">
                                {submittedGalleryUrls.map((imageUrl, index) => (
                                  <button
                                    type="button"
                                    onClick={() => setActiveReviewPhotoIndex(index)}
                                    key={`${imageUrl.slice(0, 32)}-review-${index}`}
                                    className={`post-review-gallery-thumb ${
                                      index === activeReviewPhotoIndex ? "post-review-gallery-thumb-active" : ""
                                    }`}
                                    aria-label={`Show review product photo ${index + 1}`}
                                  >
                                    <UserImage
                                      src={imageUrl}
                                      alt={`Review product photo ${index + 1}`}
                                      className="h-full w-full object-contain"
                                    />
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </>
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

                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Preview
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="post-review-pill rounded-full border px-3 py-1 text-xs font-bold">
                            {form.store || "Online"}
                          </span>
                          <span className="post-review-pill rounded-full border px-3 py-1 text-xs font-bold">
                            {form.subCategory ? `${form.category} / ${form.subCategory}` : form.category || "Category"}
                          </span>
                          {discountLabel ? (
                            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                              {discountLabel}
                            </span>
                          ) : null}
                        </div>

                        <h2 className="post-review-title mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                          {form.title || "Untitled deal"}
                        </h2>

                        <div className="mt-4 flex flex-wrap items-end gap-3">
                          <p className="text-3xl font-bold tracking-tight text-[#dc115e]">
                            {formatReviewPrice(form.price)}
                          </p>
                          {form.originalPrice ? (
                            <p className="pb-1 text-sm font-medium text-slate-500 line-through">
                              {formatReviewPrice(form.originalPrice)}
                            </p>
                          ) : null}
                        </div>

                        <div className="post-review-divider mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                          <ReviewField
                            label="Shipping"
                            value={formatReviewShipping(form.shippingMode, form.shippingCost)}
                          />
                          <ReviewField
                            label="Expiration"
                            value={
                              form.expirationMode === "set"
                                ? formatReviewDateTime(form.expiresAt)
                                : "No expiry date"
                            }
                          />
                          <ReviewField
                            label="Deal URL"
                            value={urlHost || "-"}
                            className="sm:col-span-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="post-review-divider mt-6 border-t pt-5">
                      <h3 className="post-review-title text-base font-bold">Description</h3>
                      {getDescriptionText(form.description) ? (
                        <div
                          className="deal-detail-description post-review-description mt-4 text-sm leading-7"
                          dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(form.description) }}
                        />
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">No description added.</p>
                      )}
                    </div>
                  </article>

                </section>

                <input type="hidden" name="title" value={form.title} />
                <input type="hidden" name="url" value={form.url} />
                <input type="hidden" name="price" value={form.price} />
                <input type="hidden" name="originalPrice" value={form.originalPrice} />
                <input type="hidden" name="shippingMode" value={form.shippingMode} />
                <input
                  type="hidden"
                  name="shippingCost"
                  value={form.shippingMode === "paid" ? form.shippingCost : ""}
                />
                <input type="hidden" name="store" value={form.store} />
                <input type="hidden" name="category" value={form.category} />
                <input type="hidden" name="subCategory" value={form.subCategory} />
                <input
                  type="hidden"
                  name="expiresAt"
                  value={form.expirationMode === "set" ? form.expiresAt : ""}
                />
                <input type="hidden" name="description" value={form.description} />
                <input type="hidden" name="imageUrl" value={form.imageUrl} />
                <input type="hidden" name="uploadedImageUrl" value={form.uploadedImageUrl} />
                <input type="hidden" name="imageGalleryUrls" value={JSON.stringify(submittedGalleryUrls)} />
              </form>
            ) : null}

            <div className="post-action-bar sticky bottom-0 z-10 -mx-5 px-5 py-4 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isPending}
                      className="post-secondary-button inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                  ) : null}
                </div>

                {currentStep < finalStep ? (
                  <button
                    key="next-step"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleNext();
                    }}
                    disabled={isFetching || isPending || (currentStep === 0 && (isCheckingDuplicate || hasDuplicateMatch))}
                    className="post-primary-button inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={isPending}
                      className="post-secondary-button inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      key="post-deal"
                      type="submit"
                      form="deal-review-form"
                      disabled={!canSubmit}
                      aria-busy={isPending}
                      className="post-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </FormContainer>
      </div>

      {isDiscardPromptOpen ? (
        <div
          className="post-discard-overlay fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsDiscardPromptOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-deal-title"
            aria-describedby="discard-deal-description"
            className="post-discard-dialog w-full max-w-md rounded-3xl border p-5 shadow-2xl sm:p-6"
          >
            <div>
              <h2 id="discard-deal-title" className="text-xl font-bold tracking-tight text-slate-950">
                Discard this deal?
              </h2>
              <p id="discard-deal-description" className="mt-2 text-sm leading-6 text-slate-600">
                Your entered details will be removed and you will return to the homepage.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsDiscardPromptOpen(false)}
                className="post-secondary-button inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="post-primary-button inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
              >
                Discard
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
