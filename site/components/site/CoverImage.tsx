"use client";

import * as React from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/animations/skeleton-reveal";

/**
 * کاور قاب graphite-soft (اسپک زبان عکس + s002).
 * عکس از دل اسکلت هم‌شکل (همان aspect) با skeleton-reveal ظاهر می‌شود؛
 * پرش چیدمان صفر چون aspect روی قاب قفل است.
 */
export function CoverImage({
  src,
  alt,
  width,
  height,
  sizes,
  eager = false,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <SkeletonReveal
      loading={!loaded}
      skeleton={<Skeleton className="aspect-[16/10] size-full rounded-none" />}
      className={className}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={eager}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="block size-full object-cover"
      />
    </SkeletonReveal>
  );
}
