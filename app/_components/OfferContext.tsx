import {
  AVAILABILITY_STATE_LABEL,
  FULFILLMENT_MODE_LABEL,
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
  const fulfillment = compact
    ? offer.fulfillment_modes.map((mode) => FULFILLMENT_MODE_LABEL[mode]).join(", ")
    : offerFulfillmentSummary(offer.fulfillment_modes);
  const presence = offerPresenceSummary(offer);
  const nextStep = offerNextStep(offer.offer_class);

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
        {!compact ? (
          <div>
            <dt>Dónde atiende</dt>
            <dd>
              <IconMapPin aria-hidden="true" size={18} stroke={1.8} />
              {presence}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Cómo lo recibís</dt>
          <dd>
            <IconTruckDelivery aria-hidden="true" size={18} stroke={1.8} />
            {fulfillment}
          </dd>
        </div>
        {!compact ? (
          <div>
            <dt>Qué hacés ahora</dt>
            <dd>
              <IconArrowRight aria-hidden="true" size={18} stroke={1.8} />
              {nextStep}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
