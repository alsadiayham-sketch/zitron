"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.style.setProperty("--offers-banner-height", offers.length ? BANNER_HEIGHT : "0px");

    return () => {
      document.documentElement.style.setProperty("--offers-banner-height", "0px");
    };
  }, [offers.length]);

  if (!offers.length) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[60] h-10 overflow-hidden border-b border-[var(--primary-dark)] bg-[var(--primary)] text-white" aria-label="العروض المتاحة">
      <div className="flex h-full items-center overflow-hidden text-sm font-semibold" dir="ltr">
        <div className="offers-marquee-track flex min-w-max shrink-0 items-center gap-8 whitespace-nowrap px-4" dir="ltr">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-8" aria-hidden={copy === 1}>
              {offers.map((offer) => (
                <Link
                  key={`${copy}-${offer.id}`}
                  href={`/offer?id=${encodeURIComponent(offer.id)}`}
                  tabIndex={copy === 1 ? -1 : undefined}
                  className="rounded-md px-2 py-1 underline decoration-white/40 underline-offset-4 transition-colors hover:bg-white/10 hover:decoration-white focus-visible:bg-white/10 focus-visible:decoration-white"
                  dir="rtl"
                >
                  {offer.title.trim()}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
