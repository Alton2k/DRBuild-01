import Link from "next/link";
import type { Deal } from "@/lib/deals";
import UserImage from "@/components/UserImage";

type DealCheckMiniCardProps = {
  href?: string;
  ariaLabel?: string;
  label: string;
  deal: Deal | null;
  value: string;
  fallbackTitle: string;
};

function getDealThumbnailUrl(deal: Deal) {
  return deal.imageGalleryUrls[0] || deal.imageUrl || deal.uploadedImageUrl;
}

export default function HomeDealCheckMiniCard({
  href,
  ariaLabel,
  label,
  deal,
  value,
  fallbackTitle,
}: DealCheckMiniCardProps) {
  const thumbnailUrl = deal ? getDealThumbnailUrl(deal) : "";
  const title = deal?.title ?? fallbackTitle;
  const cardClassName = `deal-check-mini-card ${
    href ? "deal-check-mini-card-link" : "deal-check-mini-card-empty"
  }`;
  const content = (
    <>
      <div className="deal-check-mini-thumb">
        {thumbnailUrl ? (
          <UserImage
            src={thumbnailUrl}
            alt=""
            width={120}
            height={90}
            sizes="60px"
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="true" className="deal-check-mini-placeholder">
            DR
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="deal-check-mini-label">{label}</p>
        <p className="deal-check-mini-title">{title}</p>
        <div className="deal-check-mini-meta">
          <span className="deal-check-mini-value">{value}</span>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
