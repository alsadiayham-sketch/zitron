"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ArrowLeft, Shield, Truck, Gift, Package, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { useProducts, useHeroDisplay } from "@/lib/firebase-hooks";
import { getCollection } from "@/lib/firebase";
import { formatCurrency } from "@/lib/admin";
import type { Offer, Product } from "@/lib/types";

// Fallback hero slides in case Firebase is empty
const fallbackHeroSlides = [
  {
    id: "fallback-1",
    type: "video" as const,
    url: "https://noreva-laboratoires.com/wp-content/uploads/2025/04/16-2-1.mp4",
    title: "تقنية متطورة",
    subtitle: "أبحاث علمية لبشرة صحية",
    order: 1,
  },
  {
    id: "fallback-2",
    type: "video" as const,
    url: "https://noreva-laboratoires.com/wp-content/uploads/2025/05/Bergasol-eau-solaire.mp4",
    title: "حماية من الشمس",
    subtitle: "حماية فائقة مع ملمس خفيف",
    order: 2,
  },
];

export default function Home() {
  const { addItem } = useCart();
  const { products: allProducts } = useProducts();
  const { slides: heroSlidesFromDb } = useHeroDisplay();
  const products = allProducts.slice(0, 4);
  const heroSlides = heroSlidesFromDb.length > 0 ? heroSlidesFromDb : fallbackHeroSlides;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [comboOffers, setComboOffers] = useState<(Offer & { productsData: Product[] })[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(getCollection("offers"), (snapshot) => {
      const now = new Date();
      const combos = snapshot.docs
        .map((doc) => ({ ...(doc.data() as Omit<Offer, "id">), id: doc.id }))
        .filter((offer) => {
          if (offer.type !== "combo") return false;
          if (offer.startDate && new Date(offer.startDate) > now) return false;
          if (offer.endDate && new Date(offer.endDate) < now) return false;
          return true;
        });

      const withProducts = combos.map((combo) => ({
        ...combo,
        productsData: (combo.eligibleProducts ?? [])
          .map((pid) => allProducts.find((p) => p.id === pid))
          .filter(Boolean) as Product[],
      }));

      setComboOffers(withProducts);
    });

    return () => unsubscribe();
  }, [allProducts]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  useEffect(() => {
    const slide = heroSlides[currentSlide];
    if (!slide || slide.type === "video") return;
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentSlide, heroSlides]);

  return (
    <>
      {/* Hero Slider */}
      <section className="relative w-full h-[400px] sm:h-[500px] lg:h-[667px] overflow-hidden bg-black">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {slide.type === "image" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.url}
                  alt={slide.title || "ZITRON"}
                  className="w-full h-full object-cover"
                />
                {(slide.title || slide.subtitle) && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center text-white px-4">
                      <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">{slide.title}</h1>
                      <p className="text-lg md:text-xl text-white/90 mb-8">{slide.subtitle}</p>
                      <Link
                        href="/products"
                        className="bg-[var(--accent)] hover:bg-[var(--gold)] text-white font-medium py-3 px-8 rounded-full transition-colors"
                      >
                        تسوق الآن
                      </Link>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <video
                  key={index === currentSlide ? "active" : "inactive"}
                  src={slide.url}
                  className="w-full h-full object-cover"
                  autoPlay={index === currentSlide}
                  muted
                  playsInline
                  onEnded={nextSlide}
                  loop={false}
                />
                {(slide.title || slide.subtitle) && (
                  <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-16">
                    <div className="text-center text-white px-4">
                      <h2 className="text-2xl md:text-3xl font-bold mb-2">{slide.title}</h2>
                      <p className="text-base md:text-lg text-white/90">{slide.subtitle}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
          aria-label="السابق"
        >
          <ChevronRight size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
          aria-label="التالي"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide ? "bg-white w-8" : "bg-white/50"
              }`}
              aria-label={`انتقل للشريحة ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Press Quotes */}
      <section className="bg-[var(--secondary)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-gray-600 italic text-sm">
                &ldquo;نجمة صيدلياتنا، تبيع منتجاً كل 10 ثوانٍ. اسمها؟ ZITRON&rdquo;
              </p>
              <p className="text-[var(--primary)] font-semibold mt-2 text-xs">— مجلة الصحة</p>
            </div>
            <div>
              <p className="text-gray-600 italic text-sm">
                &ldquo;ZITRON تغير حياة الأشخاص ذوي البشرة الحساسة&rdquo;
              </p>
              <p className="text-[var(--primary)] font-semibold mt-2 text-xs">— مجلة الجمال</p>
            </div>
            <div>
              <p className="text-gray-600 italic text-sm">
                &ldquo;ZITRON تُحدث ثورة في إزالة التصبغات&rdquo;
              </p>
              <p className="text-[var(--primary)] font-semibold mt-2 text-xs">— مجلة المرأة</p>
            </div>
          </div>
        </div>
      </section>

      {/* Combo Offers Section */}
      {comboOffers.length > 0 ? (
        <section className="py-16 bg-gradient-to-b from-orange-50/60 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {comboOffers.map((combo) => (
              <div key={combo.id} className="rounded-[2.5rem] border border-orange-200/60 bg-white p-8 shadow-xl shadow-orange-100/30">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2 text-white shadow-lg shadow-orange-200/50 mb-4">
                    <Flame className="h-5 w-5 animate-pulse" />
                    <span className="text-sm font-bold">عرض خاص</span>
                    <Flame className="h-5 w-5 animate-pulse" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                    {combo.title}
                  </h2>
                  <p className="text-lg text-slate-600">
                    اختر <span className="font-bold text-orange-600">{combo.pickCount}</span> منتجات بسعر{" "}
                    <span className="font-bold text-orange-600">{formatCurrency(combo.comboPrice ?? 0)}</span> فقط!
                  </p>
                  {combo.uniqueOnly ? (
                    <p className="mt-2 text-sm text-slate-400">* يجب اختيار منتجات مختلفة</p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">* يمكنك اختيار أكثر من واحد من نفس المنتج</p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {combo.productsData.slice(0, 10).map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-orange-300 hover:shadow-md"
                    >
                      <div className="relative aspect-square mb-3 rounded-xl bg-white overflow-hidden flex items-center justify-center">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-2 transition group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold text-slate-800 text-center">{product.name}</p>
                      <p className="mt-1 text-center text-xs text-slate-400 line-through">{formatCurrency(product.price)}</p>
                    </Link>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <Link
                    href="/checkout"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-orange-200/50 transition hover:shadow-xl hover:scale-[1.02]"
                  >
                    <Flame className="h-5 w-5" />
                    احصل على العرض الآن
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Best Products Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              أفضل منتجاتنا للعناية بالبشرة
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              منتجات العناية بالبشرة المطورة من قبل أطباء الجلدية، محبوبة في جميع أنحاء العالم
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-6 card-hover border border-gray-100 group"
              >
                <Link href={`/products/${product.id}`}>
                  <div className="relative aspect-[3/4] mb-4 bg-[var(--secondary)] rounded-xl overflow-hidden flex items-center justify-center">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {product.badge && (
                      <span className="absolute top-3 right-3 bg-[var(--accent)] text-white text-xs px-3 py-1 rounded-full">
                        {product.badge}
                      </span>
                    )}
                  </div>
                </Link>
                <div>
                  <p className="text-xs text-[var(--primary)] font-medium mb-1">
                    {product.range}
                  </p>
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-bold text-sm mb-2 group-hover:text-[var(--primary)] transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={12}
                        className={
                          i <= product.rating
                            ? "fill-[var(--star)] text-[var(--star)]"
                            : "text-gray-300"
                        }
                      />
                    ))}
                    <span className="text-xs text-gray-500 mr-1">
                      ({product.reviews})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--primary)]">
                      {product.price} ₪
                    </span>
                    <button
                      onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image, range: product.range })}
                      className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs py-2 px-4 rounded-full transition-colors"
                    >
                      أضف للسلة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-[var(--primary)] font-medium hover:gap-4 transition-all"
            >
              عرض جميع المنتجات
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Skincare Changes Lives */}
      <section className="bg-[var(--secondary)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-6">
                عناية تغير الحياة
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                في ZITRON، نؤمن بأن كل شخص يستحق بشرة صحية وجميلة. منتجاتنا مصممة
                لتلبية احتياجات جميع أنواع البشرة، من الأكثر حساسية إلى الأكثر
                تطلباً.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                تركيباتنا مستوحاة من الآليات البيولوجية الطبيعية للبشرة، مما يضمن
                فعالية مثلى مع احترام توازن البشرة الطبيعي.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-[var(--primary)] text-white py-3 px-8 rounded-full hover:bg-[var(--primary-light)] transition-colors"
              >
                اكتشف قصتنا
                <ArrowLeft size={18} />
              </Link>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 rounded-[2rem] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto bg-[var(--primary)]/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl font-bold text-[var(--primary)]">90%</span>
                  </div>
                  <p className="text-gray-600 font-medium">رضا العملاء</p>
                  <p className="text-sm text-gray-500">من أكثر من 434 عميل</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Every Generation */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              لكل جيل، حل من ZITRON
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              من الأطفال إلى كبار السن، نقدم حلولاً مصممة خصيصاً لكل مرحلة عمرية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {generations.map((gen) => (
              <div
                key={gen.title}
                className="relative rounded-2xl overflow-hidden card-hover group"
              >
                <div className="aspect-[4/5] bg-gradient-to-b from-[var(--primary)]/5 to-[var(--primary)]/20 flex items-end">
                  <div className="p-8 w-full bg-gradient-to-t from-white via-white/90 to-transparent pt-20">
                    <h3 className="text-xl font-bold text-[var(--primary)] mb-2">
                      {gen.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">{gen.description}</p>
                    <Link
                      href={gen.href}
                      className="text-[var(--primary)] font-medium text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all"
                    >
                      اكتشف المزيد
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[var(--secondary)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              آراء عملائنا
            </h2>
            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={20} className="fill-[var(--star)] text-[var(--star)]" />
                ))}
              </div>
              <span className="text-gray-600">4.7/5 من أكثر من 434 عميل</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-8 card-hover"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i <= t.rating
                          ? "fill-[var(--star)] text-[var(--star)]"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <span className="text-[var(--primary)] font-bold text-sm">
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.product}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Dermatologist Brand */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-bl from-[var(--primary)] to-[var(--primary-dark)] rounded-3xl p-12 md:p-16 text-white text-center">
            <p className="text-[var(--accent)] font-medium mb-4">العلامة التجارية</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              التي أنشأها أطباء الجلدية
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              فعالة. نظيفة. بدون تنازلات. مدعومة بأحدث التطورات في علم الأمراض
              الجلدية. لجنتنا العلمية المكونة من أطباء جلدية مرموقين تضمن أعلى
              معايير الجودة والسلامة.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 bg-white text-[var(--primary)] font-medium py-3 px-8 rounded-full hover:bg-[var(--accent-light)] transition-colors"
            >
              لجنتنا العلمية
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="bg-[var(--secondary)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[var(--accent)] font-medium mb-2">ZITRON أيضاً تعني</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)]">
              التزاماتنا
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {commitments.map((c) => (
              <div
                key={c.title}
                className="bg-white rounded-2xl p-8 text-center card-hover"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                  <c.icon size={28} className="text-[var(--primary)]" />
                </div>
                <h3 className="font-bold text-[var(--primary)] mb-2">{c.title}</h3>
                <p className="text-gray-600 text-sm">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary)] mb-4">
              أخبارنا
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {news.map((article) => (
              <article
                key={article.title}
                className="bg-white rounded-2xl overflow-hidden card-hover border border-gray-100"
              >
                <div className="aspect-video bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10"></div>
                <div className="p-6">
                  <p className="text-xs text-[var(--accent)] font-medium mb-2">
                    {article.date}
                  </p>
                  <h3 className="font-bold text-[var(--primary)] mb-3">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{article.excerpt}</p>
                  <Link
                    href="#"
                    className="text-[var(--primary)] font-medium text-sm inline-flex items-center gap-2 hover:gap-3 transition-all"
                  >
                    اقرأ المزيد
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((b) => (
              <div key={b.title} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <b.icon size={22} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--primary)]">
                    {b.title}
                  </h4>
                  <p className="text-xs text-gray-600">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// Data
const generations = [
  {
    title: "للبشرة الشابة",
    description: "حلول مصممة خصيصاً لمشاكل البشرة في سن المراهقة والشباب",
    href: "/products?age=young",
  },
  {
    title: "للبشرة الناضجة",
    description: "عناية متكاملة لمكافحة علامات التقدم في السن",
    href: "/products?age=mature",
  },
  {
    title: "لجميع العائلة",
    description: "منتجات آمنة ولطيفة مناسبة لجميع أفراد العائلة",
    href: "/products?age=family",
  },
];

const testimonials = [
  {
    name: "سارة أ.",
    product: "سنسيديان AR+ كريم CC",
    rating: 5,
    text: "منتج رائع! بشرتي أصبحت مثالية الآن. لا أستطيع الاستغناء عنه.",
  },
  {
    name: "محمد ك.",
    product: "صن أكتيف SPF50+",
    rating: 5,
    text: "حماية ممتازة من الشمس بدون ملمس دهني. أفضل واقي شمسي استخدمته.",
  },
  {
    name: "نورة م.",
    product: "إكسفولياك سيروم",
    rating: 4,
    text: "بعد شهر من الاستخدام، اختفت البقع تماماً. نتائج مذهلة!",
  },
];

const commitments = [
  {
    icon: Shield,
    title: "تركيبات آمنة",
    description: "بدون بارابين، بدون فينوكسي إيثانول",
  },
  {
    icon: Shield,
    title: "صديقة للبيئة",
    description: "عبوات قابلة لإعادة التدوير",
  },
  {
    icon: Shield,
    title: "مختبرة سريرياً",
    description: "اختبارات صارمة تحت إشراف أطباء الجلدية",
  },
  {
    icon: Shield,
    title: "صنع في فرنسا",
    description: "جودة فرنسية عالية المعايير",
  },
];

const news = [
  {
    title: "إطلاق مجموعة الحماية من الشمس الجديدة",
    date: "مايو 2026",
    excerpt: "اكتشف مجموعتنا الجديدة من واقيات الشمس بتركيبات خفيفة ومقاومة للماء.",
  },
  {
    title: "نصائح للعناية بالبشرة في الصيف",
    date: "يونيو 2026",
    excerpt: "كيف تحمي بشرتك من أشعة الشمس الضارة مع الحفاظ على ترطيبها.",
  },
  {
    title: "ZITRON تفوز بجائزة أفضل علامة تجارية",
    date: "أبريل 2026",
    excerpt: "فخورون بالحصول على جائزة أفضل علامة تجارية للعناية بالبشرة لعام 2026.",
  },
];

const benefits = [
  {
    icon: Gift,
    title: "منتج مجاني",
    description: "عند الشراء بقيمة 89 شيكل أو أكثر",
  },
  {
    icon: Shield,
    title: "دفع آمن",
    description: "فيزا، ماستركارد، مدى",
  },
  {
    icon: Package,
    title: "عينتان مجانيتان",
    description: "اختر من مجموعة مختارة مع مشتريات 39 شيكل",
  },
  {
    icon: Truck,
    title: "شحن مجاني خلال 48 ساعة",
    description: "للطلبات فوق 49 شيكل",
  },
];
