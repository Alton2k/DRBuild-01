/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from "react";

type UserImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Renders user-provided or stored images that cannot be safely allowlisted
 * for next/image optimization ahead of time.
 */
export default function UserImage({ alt, ...props }: UserImageProps) {
  return <img {...props} alt={alt} />;
}
