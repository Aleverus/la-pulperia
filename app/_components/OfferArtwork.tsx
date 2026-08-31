import {
  IconChefHat,
  IconDeviceLaptop,
  IconShoppingBag,
  IconTools,
  type Icon,
} from "@tabler/icons-react";
import {
  OFFER_CLASS_LABEL,
  type OfferClass,
} from "@/lib/catalog";

const FALLBACK_ICON: Record<OfferClass, Icon> = {
  stocked_product: IconShoppingBag,
  scheduled_food: IconChefHat,
  local_service: IconTools,
  digital_offer: IconDeviceLaptop,
};

export function OfferFallback({
  offerClass,
  title,
  className,
}: {
  offerClass: OfferClass;
  title: string;
  className?: string;
}) {
  const FallbackIcon = FALLBACK_ICON[offerClass];

  return (
    <div
      className={["offer-fallback", `is-${offerClass}`, className]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={`Sin foto propia para ${title}`}
    >
      <FallbackIcon aria-hidden="true" size={42} stroke={1.5} />
      <span>{OFFER_CLASS_LABEL[offerClass]}</span>
    </div>
  );
}
