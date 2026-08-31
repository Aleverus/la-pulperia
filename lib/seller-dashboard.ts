import { freshnessBand, type FreshnessBand } from "@/lib/freshness";
import type { OwnedOffer } from "@/lib/seller";

export type SellerOfferTask = {
  offer: OwnedOffer;
  freshness: FreshnessBand;
  priority: number;
};

export function getSellerOfferTasks(
  offers: OwnedOffer[],
  now: Date = new Date(),
): SellerOfferTask[] {
  return offers
    .map((offer) => {
      const freshness = freshnessBand(new Date(offer.confirmed_at), now);
      return {
        offer,
        freshness,
        priority: sellerOfferPriority(offer, freshness),
      };
    })
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        new Date(right.offer.confirmed_at).getTime() -
          new Date(left.offer.confirmed_at).getTime(),
    );
}

export function sellerOfferPriority(
  offer: OwnedOffer,
  freshness: FreshnessBand,
): number {
  if (offer.status === "published" && freshness === "stale") return 0;
  if (offer.status === "published" && freshness === "confirm") return 1;
  if (offer.status === "draft") return 2;
  if (offer.status === "paused") return 3;
  if (offer.status === "published") return 4;
  return 5;
}

export function countOffersNeedingFreshness(tasks: SellerOfferTask[]): number {
  return tasks.filter(
    ({ offer, freshness }) =>
      offer.status === "published" && freshness !== "recent",
  ).length;
}

export function countInactiveOffers(tasks: SellerOfferTask[]): number {
  return tasks.filter(
    ({ offer }) => offer.status === "draft" || offer.status === "paused",
  ).length;
}
