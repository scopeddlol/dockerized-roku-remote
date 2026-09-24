import { useState } from "react";
import { iconUrl } from "@/lib/api";
import { brandFor } from "@/lib/brands";
import { useIsDark } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Crisp bundled brand logo when we recognise the app, otherwise the
 * channel artwork the Roku itself serves.
 */
export function AppIcon({
  id,
  name,
  className,
  logoClassName,
}: {
  id: string;
  name: string;
  className?: string;
  logoClassName?: string;
}) {
  const dark = useIsDark();
  const brand = brandFor(name);
  const [brandFailed, setBrandFailed] = useState(false);

  if (brand && !brandFailed) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img
          src={dark ? brand.dark : brand.light}
          alt=""
          draggable={false}
          onError={() => setBrandFailed(true)}
          className={cn("size-1/2 object-contain drop-shadow-sm", logoClassName)}
        />
      </div>
    );
  }
  return (
    <div className={cn("overflow-hidden", className)}>
      <img src={iconUrl(id)} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
    </div>
  );
}
