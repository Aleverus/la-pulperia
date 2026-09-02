"use client";

import { useSyncExternalStore } from "react";
import {
  STARTER_OFFER_DRAFT_KEY,
  type StarterOfferDraft,
} from "@/lib/starter-offer-draft";

const STARTER_DRAFT_CHANGED = "la-pulperia:starter-offer-changed";

export function useStarterOfferDraftStorage(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeStarterOfferDraft(draft: StarterOfferDraft) {
  window.localStorage.setItem(STARTER_OFFER_DRAFT_KEY, JSON.stringify(draft));
  window.dispatchEvent(new Event(STARTER_DRAFT_CHANGED));
}

export function clearStarterOfferDraft() {
  window.localStorage.removeItem(STARTER_OFFER_DRAFT_KEY);
  window.dispatchEvent(new Event(STARTER_DRAFT_CHANGED));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STARTER_DRAFT_CHANGED, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STARTER_DRAFT_CHANGED, onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STARTER_OFFER_DRAFT_KEY);
}

function getServerSnapshot() {
  return null;
}
