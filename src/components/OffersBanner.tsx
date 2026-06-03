"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { getCollection } from "@/lib/firebase";
import type { Offer } from "@/lib/types";

const BANNER_HEIGHT = "44px";

function isOfferActive(offer: Offer): boolean {
  const now = new Date();
  if (offer.startDate && new Date(offer.startDate) > now) return false;
  if (offer.endDate && new Date(offer.endDate) < now) return false;
  return true;
}

export default function OffersBanner() {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(getCollection("offers"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ ...(doc.data() as Omit<Offer, "id">), id: doc.id }))
        .filter((offer) => offer.title.trim() && isOfferActive(offer))
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

      setOffers(data);
    });

    return () => unsubscribe();
  }, []);

  const bannerText = useMemo(() => offers.map((offer) => offer.title.trim()).filter(Boolean).join(" | "), [offers]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.style.setProperty("--offers-banner-height", bannerText ? BANNER_HEIGHT : "0px");

    return () => {
      document.documentElement.style.setProperty("--offers-banner-height", "0px");
    };
  }, [bannerText]);

  if (!bannerText) {
    return null;
  }

  return (
    <div className="promo-bar sticky top-0 z-[60] h-11 overflow-hidden border-b border-white/10 text-white shadow-sm">
      <div className="offers-banner-track flex h-full min-w-[200%] items-center whitespace-nowrap">
        <span className="px-6 text-sm font-semibold" dir="rtl">
          {bannerText}
        </span>
        <span className="px-6 text-sm font-semibold" dir="rtl" aria-hidden="true">
          {bannerText}
        </span>
      </div>

      <style jsx>{`
        .offers-banner-track {
          width: max-content;
          animation: offers-banner-scroll 22s linear infinite;
          will-change: transform;
        }

        @keyframes offers-banner-scroll {
          from {
            transform: translateX(calc(-50% - 1.5rem));
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export { isOfferActive };
