import {
  AVAILABILITY_STATE_LABEL,
  FULFILLMENT_MODE_LABEL,
  PRESENCE_MODE_LABEL,
  type SearchOffer,
} from "@/lib/catalog";
import {
  IconArrowRight,
  IconCalendar,
  IconCircleFilled,
  IconMapPin,
  IconTruckDelivery,
} from "@tabler/icons-react";
import {
  offerAvailabilitySummary,
  offerFreshnessSummary,
  offerFulfillmentSummary,
  offerNextStep,
  offerPresenceSummary,
} from "@/lib/offer-context";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";

type PublicOfferContext = Pick<
  SearchOffer,
  | "offer_class"
  | "availability_model"
  | "availability_state"
  | "availability_details"
  | "confirmed_at"
  | "presence_mode"
  | "coverage_label"
  | "service_territory"
  | "fulfillment_modes"
>;

export function OfferContext({
  offer,
  compact = false,
}: {
  offer: PublicOfferContext;
  compact?: boolean;
}) {
  const availability = compact
    ? AVAILABILITY_STATE_LABEL[offer.availability_state]
    : offerAvailabilitySummary(offer);
  const freshness = compact
    ? FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]
    : offerFreshnessSummary(offer.confirmed_at);
  const presence = compact
    ? offer.presence_mode === "fixed_location"
      ? PRESENCE_MODE_LABEL[offer.presence_mode]
      : offerPresenceSummary(offer)
    : offerPresenceSummary(offer);
  const fulfillment = compact
    ? offer.fulfillment_modes.map((mode) => FULFILLMENT_MODE_LABEL[mode]).join(", ")
    : offerFulfillmentSummary(offer.fulfillment_modes);
  const nextStep = compact
    ? COMPACT_NEXT_STEP[offer.offer_class]
    : offerNextStep(offer.offer_class);

  return (
    <div className={compact ? "offer-context is-compact" : "offer-context"}>
      <dl>
        <div className={`offer-context__availability is-${offer.availability_state}`}>
          <dt>Disponibilidad</dt>
          <dd>
            <IconCircleFilled aria-hidden="true" size={13} />
            {availability}
          </dd>
        </div>
        <div>
          <dt>Vigencia</dt>
          <dd>
            <IconCalendar aria-hidden="true" size={18} stroke={1.8} />
            {freshness}
          </dd>
        </div>
        <div>
          <dt>Atención</dt>
          <dd>
            <IconMapPin aria-hidden="true" size={18} stroke={1.8} />
            {presence}
          </dd>
        </div>
        <div>
          <dt>Cumplimiento</dt>
          <dd>
            <IconTruckDelivery aria-hidden="true" size={18} stroke={1.8} />
            {fulfillment}
          </dd>
        </div>
        <div>
          <dt>Siguiente paso</dt>
          <dd>
            <IconArrowRight aria-hidden="true" size={18} stroke={1.8} />
            {nextStep}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const COMPACT_NEXT_STEP: Record<PublicOfferContext["offer_class"], string> = {
  stocked_product: "Indicá cantidad",
  scheduled_food: "Indicá cantidad y ventana",
  local_service: "Describí el trabajo",
  digital_offer: "Describí alcance o plan",
};
