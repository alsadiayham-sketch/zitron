"use client";

import { useState, useEffect } from "react";
import { onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { getCollection, getDocRef } from "./firebase";
import type { Product, HeroSlide, SiteSettings } from "./types";

export type { HeroSlide, SiteSettings };

// Hook to get products from Firebase in real-time
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      getCollection("products"),
      (snapshot) => {
        const prods = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Product[];
        setProducts(prods);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { products, loading };
}

// Hook to get hero display slides
export function useHeroDisplay() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(getCollection("heroDisplay"), orderBy("order")),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as HeroSlide[];
        setSlides(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching hero display:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { slides, loading };
}

// Hook to get site settings
export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      getDocRef("settings", "config"),
      (doc) => {
        if (doc.exists()) {
          setSettings(doc.data() as SiteSettings);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching settings:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { settings, loading };
}

// One-time fetch for products (SSR-compatible, non-realtime)
export async function fetchProducts(): Promise<Product[]> {
  const snapshot = await getDocs(getCollection("products"));
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Product[];
}

// One-time fetch for hero slides
export async function fetchHeroDisplay(): Promise<HeroSlide[]> {
  const q = query(getCollection("heroDisplay"), orderBy("order"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as HeroSlide[];
}