"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "@/lib/store-data";
import { getCollection } from "@/lib/store-data";
import { isOfferActive } from "@/lib/offers";
import type { Offer } from "@/lib/types";

const BANNER_HEIGHT = "40px";

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

  const bannerText = useMemo(() => {
    const titles = offers.map((offer) => offer.title.trim()).filter(Boolean);
    if (titles.length === 0) return "";
    return titles.join(" · ");
  }, [offers]);

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
    <div className="sticky top-0 z-[60] h-10 border-b border-[var(--primary-dark)] bg-[var(--primary)] text-white">
      <div className="clinical-container flex h-full items-center gap-3 text-sm font-semibold" dir="rtl">
        <span className="min-w-0 flex-1 truncate" title={offers[0]?.title}>{offers[0]?.title}</span>
        <details className="relative shrink-0">
          <summary className="cursor-pointer rounded-md px-2 py-1 underline decoration-white/40 underline-offset-4">
            العروض ({offers.length})
          </summary>
          <div className="absolute left-0 top-full mt-2 max-h-[60vh] w-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--foreground)] sm:w-96">
            <ul className="space-y-3">
              {offers.map(offer => <li key={offer.id} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">{offer.title}</li>)}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
