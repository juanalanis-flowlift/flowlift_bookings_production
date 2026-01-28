import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users, BarChart3, CheckCircle, ChevronDown } from "lucide-react";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import { useState, useEffect, useCallback, useRef } from "react";
import { MasonryGrid } from "@/components/MasonryGrid";
import { PinCard } from "@/components/PinCard";

import flowlift_logo_Btext_noBG from "@assets/flowlift_logo_Btext_noBG.png";

// Service category images
import haircutImg1 from "@assets/adam-winger-FkAZqQJTbXM-unsplash_1766644171026.jpeg";
import haircutImg2 from "@assets/baylee-gramling-MMz03PyCOZg-unsplash_1766644171026.jpeg";
import haircutImg3 from "@assets/agustin-fernandez-1Pmp9uxK8X8-unsplash_1766644171026.jpeg";
import haircutImg4 from "@assets/nathon-oski-fE42nRlBcG8-unsplash_1766644171026.jpeg";
import haircutImg5 from "@assets/benyamin-bohlouli-LGXN4OSQSa4-unsplash_1766644171026.jpeg";
import haircutImg6 from "@assets/adam-winger-ZsUbK9zSgMo-unsplash_1766719768370.jpeg";

import haircutImg7 from "@assets/haircut_amir-seilsepour-_hAaFD1ucfk-unsplash_optimized.webp";
import haircutImg8 from "@assets/haircut_arthur-humeau-Twd3yaqA2NM-unsplash_optimized.webp";
import haircutImg9 from "@assets/haircut_christin-hume-0MoF-Fe0w0A-unsplash_optimized.webp";
import haircutImg10 from "@assets/haircut_farhad-ibrahimzade-_A0jYQvTm9M-unsplash_optimized.webp";
import haircutImg11 from "@assets/haircut_filipe-cantador-UUaQSzN7mfE-unsplash_optimized.webp";
import haircutImg12 from "@assets/haircut_giorgio-trovato-gb6gtiTZKB8-unsplash_optimized.webp";
import haircutImg13 from "@assets/haircut_hayley-kim-studios-sRSRuxkOuzI-unsplash_optimized.webp";
import haircutImg14 from "@assets/haircut_kartik-gada--4iMX-4MIZ8-unsplash_optimized.webp";
import haircutImg15 from "@assets/haircut_kateryna-hliznitsova--RC29zvakwg-unsplash_optimized.webp";
import haircutImg16 from "@assets/haircut_laura-chouette-yxcCgzSB_iI-unsplash_optimized.webp";
import haircutImg17 from "@assets/haircut_rosa-rafael-Pe9IXUuC6QU-unsplash_optimized.webp";
import haircutImg18 from "@assets/haircut_rune-enstad-qeuJczNo54w-unsplash_optimized.webp";
import haircutImg19 from "@assets/haircut_salvador-gomez-arellano-7DqlkBfddC4-unsplash_optimized.webp";
import haircutImg20 from "@assets/haircut_toa-heftiba-a9pFSC8dTlo-unsplash_optimized.webp";
import haircutImg21 from "@assets/haircut_victor-sirbu-kA74I2XMiSQ-unsplash_optimized.webp";

import photoImg1 from "@assets/gemali-martinez-naO7yFfuBa4-unsplash_1766720285256.jpeg";
import photoImg2 from "@assets/matthias-blonski-EAYkeJ0zc4w-unsplash_1766720285257.jpeg";
import photoImg3 from "@assets/patricia-palma-Se58TjWOmJM-unsplash_1766720285257.jpeg";
import photoImg4 from "@assets/reinhart-julian-WxM465oM4j4-unsplash_1766720285257.jpeg";
import photoImg5 from "@assets/noemi-macavei-katocz-zrk7WirlxgM-unsplash_1766720285257.jpeg";
import photoImg6 from "@assets/redd-francisco-0eo4e1eh13I-unsplash_1766720285257.jpeg";

import photoImg7 from "@assets/photo_charles-chen-dKsA5xl8Ygo-unsplash_optimized.webp";
import photoImg8 from "@assets/photo_gabe-hobbs-Py3wHdjMaAI-unsplash_optimized.webp";
import photoImg9 from "@assets/photo_jannis-edelmann-G69CWIw1SEU-unsplash_optimized.webp";
import photoImg10 from "@assets/photo_jeshoots-com-p8kaVRe4edM-unsplash_optimized.webp";
import photoImg11 from "@assets/photo_jordan-whitfield-qODM8pfwRO4-unsplash_optimized.webp";
import photoImg12 from "@assets/photo_kinga-howard-HHw9lc0ogIs-unsplash_optimized.webp";
import photoImg13 from "@assets/photo_kyle-loftus-tn9tmUmQA4A-unsplash_optimized.webp";
import photoImg14 from "@assets/photo_lisa-amann-6YX2n7eXb7o-unsplash_optimized.webp";
import photoImg15 from "@assets/photo_mariah-krafft-ayc1G5wV3aA-unsplash_optimized.webp";
import photoImg16 from "@assets/photo_pablo-soriano-Qe5DTJKYM8I-unsplash_optimized.webp";
import photoImg17 from "@assets/photo_samsung-memory-us-6BI-Q0MY3so-unsplash_optimized.webp";
import photoImg18 from "@assets/photo_samsung-memory-us-XhgzxVbz2ss-unsplash_optimized.webp";
import photoImg19 from "@assets/photo_shubh-karman-singh-fHhwdJkt_LE-unsplash_optimized.webp";
import photoImg20 from "@assets/photo_szabo-viktor-6zEfniBMs6c-unsplash_optimized.webp";
import photoImg21 from "@assets/photo_taisiia-stupak-0fKMSXKi7sM-unsplash_optimized.webp";

import consultationImg1 from "@assets/charlesdeluvio-rRWiVQzLm7k-unsplash_1766721245961.jpeg";
import consultationImg2 from "@assets/startae-team-7tXA8xwe4W4-unsplash_1766721245961.jpeg";
import consultationImg3 from "@assets/gabrielle-henderson-HJckKnwCXxQ-unsplash_1766721245961.jpeg";
import consultationImg4 from "@assets/amy-hirschi-JaoVGh5aJ3E-unsplash_1766721245961.jpeg";
import consultationImg5 from "@assets/charlesdeluvio-Lks7vei-eAg-unsplash_1766721245961.jpeg";
import consultationImg6 from "@assets/nick-morrison-FHnnjk1Yj7Y-unsplash_1766721245961.jpeg";

import consImg7 from "@assets/consultation_antonika-chanel-RJCslxmvBcs-unsplash_optimized.webp";
import consImg8 from "@assets/consultation_christine-galligan-g2hNOyN18tY-unsplash_optimized.webp";
import consImg9 from "@assets/consultation_jakub-zerdzicki-QZw8l2xO5xw-unsplash_optimized.webp";
import consImg10 from "@assets/consultation_kelly-sikkema-giijfNulwxk-unsplash_optimized.webp";
import consImg11 from "@assets/consultation_kenny-eliason-y_6rqStQBYQ-unsplash_optimized.webp";
import consImg12 from "@assets/consultation_linkedin-sales-solutions-Be5aVKFv9ho-unsplash_optimized.webp";
import consImg13 from "@assets/consultation_micheile-henderson-SoT4-mZhyhE-unsplash_optimized.webp";
import consImg14 from "@assets/consultation_national-cancer-institute-JHO4rVo6P1A-unsplash_optimized.webp";
import consImg15 from "@assets/consultation_national-cancer-institute-nR2C9AVzfHY-unsplash_optimized.webp";
import consImg16 from "@assets/consultation_national-cancer-institute-tl447mekwuQ-unsplash_optimized.webp";
import consImg17 from "@assets/consultation_scott-graham-5fNmWej4tAA-unsplash_optimized.webp";
import consImg18 from "@assets/consultation_sebastian-herrmann-O2o1hzDA7iE-unsplash_optimized.webp";
import consImg19 from "@assets/consultation_thisisengineering--RFVw0jMyM4-unsplash_optimized.webp";
import consImg20 from "@assets/consultation_thisisengineering-ZPeXrWxOjRQ-unsplash_optimized.webp";
import consImg21 from "@assets/consultation_vitaly-gariev-XjpH81N6rDc-unsplash_optimized.webp";

import classImg1 from "@assets/tim-schmidbauer-bUiT0-6kB64-unsplash_1766721913013.jpeg";
import classImg2 from "@assets/april-walker-9oB319CAOWU-unsplash_1766721913013.jpeg";
import classImg3 from "@assets/angry-_-kat-9XYHYERuFAk-unsplash_1766721913013.jpeg";
import classImg4 from "@assets/vitaly-gariev-IIisONUL2d8-unsplash_1766721913013.jpeg";
import classImg5 from "@assets/sweet-life-j14Q19jXDFQ-unsplash_1766721913013.jpeg";
import classImg6 from "@assets/andrey-k-rccbptXljzw-unsplash_1766721913013.jpeg";

import classImg7 from "@assets/class_andrey-k-aOLDCqOEFDo-unsplash_optimized.webp";
import classImg8 from "@assets/class_chiputt-golf-iqv6HORqy8Q-unsplash_optimized.webp";
import classImg9 from "@assets/class_dylan-gillis-YJdCZba0TYE-unsplash_optimized.webp";
import classImg10 from "@assets/class_graham-mansfield-2j6IzAIbifQ-unsplash_optimized.webp";
import classImg11 from "@assets/class_kaylee-garrett-GaprWyIw66o-unsplash_optimized.webp";
import classImg12 from "@assets/class_konrad-koller-Ci9S1aI2HlM-unsplash_optimized.webp";
import classImg13 from "@assets/class_kristopher-allison-KU4zYj4u0mo-unsplash_optimized.webp";
import classImg14 from "@assets/class_kyle-hinkson-JMb_E9r1TVE-unsplash_optimized.webp";
import classImg15 from "@assets/class_mark-williams-a7hRtpPIyoo-unsplash_optimized.webp";
import classImg16 from "@assets/class_nitin-mishra-4kcg1hK0bew-unsplash_optimized.webp";
import classImg17 from "@assets/class_rezli-gr4cz_ESCak-unsplash_optimized.webp";
import classImg18 from "@assets/class_roxana-popovici-aY5uOJ2o96g-unsplash_optimized.webp";
import classImg19 from "@assets/class_shraga-kopstein-BZtgr07VwRM-unsplash_optimized.webp";
import classImg20 from "@assets/class_vitaly-gariev-KY4EBtvl-KI-unsplash_optimized.webp";
import classImg21 from "@assets/class_vitaly-gariev-hYdCmd8Y3_8-unsplash_optimized.webp";

import equipmentImg1 from "@assets/chirayu-trivedi-wzvy-_V3e2E-unsplash_1766722836984.jpeg";
import equipmentImg2 from "@assets/skylar-zilka-MIsJh2WezM8-unsplash_1766722836984.jpeg";
import equipmentImg3 from "@assets/edward-howell-z80bSH93Wk4-unsplash_1766722836984.jpeg";
import equipmentImg4 from "@assets/photos-by-lanty-O38Id_cyV4M-unsplash_1766722836984.jpeg";
import equipmentImg5 from "@assets/ted-balmer-puFgHWFtUzI-unsplash_1766722836984.jpeg";
import equipmentImg6 from "@assets/jackery-power-station-wrGNZIPfias-unsplash_1766722836984.jpeg";

import venueImg1 from "@assets/john-towner-X48hkTT1qQc-unsplash_1766785219140.jpeg";
import venueImg2 from "@assets/alesia-kazantceva-VWcPlbHglYc-unsplash_1766785219140.jpeg";
import venueImg3 from "@assets/jose-alejandro-cuffia-NtiZoP2CKOs-unsplash_1766785219140.jpeg";
import venueImg4 from "@assets/anisa-ryanda-putri-JPVCcArnKNc-unsplash_1766785219140.jpeg";
import venueImg5 from "@assets/soulseeker-creative-photography-aRQrz0fclB8-unsplash_1766785219140.jpeg";
import venueImg6 from "@assets/benjamin-child-GWe0dlVD9e0-unsplash_1766785219140.jpeg";

interface ServiceImage {
  src: string;
  category: string;
  aspectRatio: "auto" | "square" | "portrait" | "landscape";
}

export default function Landing() {
  const { t } = useI18n();
  const [visibleItems, setVisibleItems] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Group images by category for the rotating hero
  const heroCategories = [
    {
      id: "haircut",
      phrase: t("landing.hero.rotating.haircut"),
      images: [
        haircutImg1, haircutImg2, haircutImg3, haircutImg4, haircutImg5, haircutImg6,
        haircutImg7, haircutImg8, haircutImg9, haircutImg10, haircutImg11, haircutImg12,
        haircutImg13, haircutImg14, haircutImg15, haircutImg16, haircutImg17, haircutImg18,
        haircutImg19, haircutImg20, haircutImg21
      ],
      color: "text-yellow-600"
    },
    {
      id: "photo",
      phrase: t("landing.hero.rotating.photoSession"),
      images: [
        photoImg1, photoImg2, photoImg3, photoImg4, photoImg5, photoImg6,
        photoImg7, photoImg8, photoImg9, photoImg10, photoImg11, photoImg12,
        photoImg13, photoImg14, photoImg15, photoImg16, photoImg17, photoImg18,
        photoImg19, photoImg20, photoImg21
      ],
      color: "text-emerald-700"
    },
    {
      id: "consultation",
      phrase: t("landing.hero.rotating.consultation"),
      images: [
        consultationImg1, consultationImg2, consultationImg3, consultationImg4, consultationImg5, consultationImg6,
        consImg7, consImg8, consImg9, consImg10, consImg11, consImg12,
        consImg13, consImg14, consImg15, consImg16, consImg17, consImg18,
        consImg19, consImg20, consImg21
      ],
      color: "text-rose-600"
    },
    {
      id: "class",
      phrase: t("landing.hero.rotating.classOrLesson"),
      images: [
        classImg1, classImg2, classImg3, classImg4, classImg5, classImg6,
        classImg7, classImg8, classImg9, classImg10, classImg11, classImg12,
        classImg13, classImg14, classImg15, classImg16, classImg17, classImg18,
        classImg19, classImg20, classImg21
      ],
      color: "text-blue-600"
    }
  ];

  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const currentCategory = heroCategories[currentCategoryIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCategoryIndex((prev) => (prev + 1) % heroCategories.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroCategories.length]);

  // Combined images for infinite scroll section
  const allServiceImages: ServiceImage[] = [
    { src: haircutImg1, category: t("landing.hero.rotating.haircut"), aspectRatio: "portrait" },
    { src: photoImg1, category: t("landing.hero.rotating.photoSession"), aspectRatio: "landscape" },
    { src: consultationImg1, category: t("landing.hero.rotating.consultation"), aspectRatio: "square" },
    { src: haircutImg2, category: t("landing.hero.rotating.haircut"), aspectRatio: "portrait" },
    { src: classImg1, category: t("landing.hero.rotating.classOrLesson"), aspectRatio: "landscape" },
    { src: equipmentImg1, category: t("landing.hero.rotating.equipmentHire"), aspectRatio: "square" },
    { src: photoImg2, category: t("landing.hero.rotating.photoSession"), aspectRatio: "portrait" },
    { src: venueImg1, category: t("landing.hero.rotating.venueHire"), aspectRatio: "landscape" },
    { src: consultationImg2, category: t("landing.hero.rotating.consultation"), aspectRatio: "square" },
    { src: haircutImg3, category: t("landing.hero.rotating.haircut"), aspectRatio: "portrait" },
    { src: classImg2, category: t("landing.hero.rotating.classOrLesson"), aspectRatio: "landscape" },
    { src: equipmentImg2, category: t("landing.hero.rotating.equipmentHire"), aspectRatio: "square" },
    { src: photoImg3, category: t("landing.hero.rotating.photoSession"), aspectRatio: "portrait" },
    { src: venueImg2, category: t("landing.hero.rotating.venueHire"), aspectRatio: "landscape" },
    { src: haircutImg4, category: t("landing.hero.rotating.haircut"), aspectRatio: "square" },
    { src: consultationImg3, category: t("landing.hero.rotating.consultation"), aspectRatio: "portrait" },
    { src: classImg3, category: t("landing.hero.rotating.classOrLesson"), aspectRatio: "landscape" },
    { src: equipmentImg3, category: t("landing.hero.rotating.equipmentHire"), aspectRatio: "square" },
    { src: photoImg4, category: t("landing.hero.rotating.photoSession"), aspectRatio: "portrait" },
    { src: venueImg3, category: t("landing.hero.rotating.venueHire"), aspectRatio: "landscape" },
    { src: haircutImg5, category: t("landing.hero.rotating.haircut"), aspectRatio: "square" },
    { src: consultationImg4, category: t("landing.hero.rotating.consultation"), aspectRatio: "portrait" },
    { src: classImg4, category: t("landing.hero.rotating.classOrLesson"), aspectRatio: "landscape" },
    { src: equipmentImg4, category: t("landing.hero.rotating.equipmentHire"), aspectRatio: "square" },
    { src: photoImg5, category: t("landing.hero.rotating.photoSession"), aspectRatio: "portrait" },
    { src: venueImg4, category: t("landing.hero.rotating.venueHire"), aspectRatio: "landscape" },
    { src: haircutImg6, category: t("landing.hero.rotating.haircut"), aspectRatio: "square" },
    { src: consultationImg5, category: t("landing.hero.rotating.consultation"), aspectRatio: "portrait" },
    { src: classImg5, category: t("landing.hero.rotating.classOrLesson"), aspectRatio: "landscape" },
    { src: equipmentImg5, category: t("landing.hero.rotating.equipmentHire"), aspectRatio: "square" },
    { src: photoImg6, category: t("landing.hero.rotating.photoSession"), aspectRatio: "portrait" },
    { src: venueImg5, category: t("landing.hero.rotating.venueHire"), aspectRatio: "landscape" },
    { src: consultationImg6, category: t("landing.hero.rotating.consultation"), aspectRatio: "square" },
    { src: classImg6, category: t("landing.hero.rotating.classOrLesson"), aspectRatio: "portrait" },
    { src: equipmentImg6, category: t("landing.hero.rotating.equipmentHire"), aspectRatio: "landscape" },
    { src: venueImg6, category: t("landing.hero.rotating.venueHire"), aspectRatio: "square" },
  ];

  const benefits = [
    "landing.benefits.noDoubleBookings",
    "landing.benefits.mobileFriendly",
    "landing.benefits.instantConfirmations",
    "landing.benefits.multipleServices",
    "landing.benefits.customProfile",
    "landing.benefits.multiTenant",
  ];

  // Infinite scroll implementation
  const loadMore = useCallback(() => {
    // Only load more if NOT on mobile (width >= 768)
    if (window.innerWidth < 768) return;

    if (isLoadingMore || visibleItems >= allServiceImages.length) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleItems(prev => Math.min(prev + 12, allServiceImages.length));
      setIsLoadingMore(false);
    }, 500);
  }, [isLoadingMore, visibleItems, allServiceImages.length]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  return (
    <div className="min-h-screen bg-white">
      {/* Pinterest-style header */}
      <header className="sticky top-0 z-50 bg-white border-b h-20 flex items-center">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/">
              <img
                src={flowlift_logo_Btext_noBG}
                alt="flowlift"
                className="h-8 md:h-10 object-contain"
              />
            </a>
            <nav className="hidden md:flex items-center gap-8 font-sans">
              <a href="/about" className="text-base font-bold hover:underline">{t("nav.about")}</a>
              <a href="/products" className="text-base font-bold hover:underline">{t("nav.products")}</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher minimal />
            <a href="/signin">
              <Button variant="ghost" className="font-bold">{t("landing.logIn")}</Button>
            </a>
            <a href="/signin">
              <Button className="rounded-full px-6 font-bold">{t("landing.startFree")}</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section - Masonry word carousel */}
      <section className="pt-24 pb-32">
        <div className="container mx-auto px-4 text-center mb-24 h-[280px] flex flex-col justify-center">
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-8">
            {t("landing.hero.fixedText")}<br />
            <span className={`transition-colors duration-500 ${currentCategory.color}`}>
              {currentCategory.phrase}
            </span>
          </h1>

          <div className="flex justify-center gap-2">
            {heroCategories.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentCategoryIndex ? "bg-primary scale-150" : "bg-gray-200"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Hero Masonry Grid */}
        <div className="w-full overflow-hidden max-h-[550px] relative">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent z-10" />
          <MasonryGrid
            columnCount={{ mobile: 3, tablet: 5, desktop: 7 }}
            gap={16}
            className="opacity-90 pointer-events-none px-4"
          >
            {[...currentCategory.images, ...currentCategory.images, ...currentCategory.images].map((src, index) => (
              <div key={`${currentCategory.id}-${index}`} className="rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-700">
                <img
                  src={src}
                  alt=""
                  className="w-full object-cover"
                  style={{ height: `${180 + (index % 5) * 60}px` }}
                />
              </div>
            ))}
          </MasonryGrid>
        </div>

        <div className="flex justify-center mt-12 animate-bounce">
          <ChevronDown className="h-10 w-10 text-gray-300" />
        </div>
      </section>

      {/* Pinterest-style Section 1: Search */}
      <section className="py-32 bg-[#FFFD92]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20">
          <div className="flex-1">
            <div className="relative max-w-[400px] mx-auto aspect-[3/4] rounded-[60px] overflow-hidden shadow-2xl border-[16px] border-black">
              <img src={consultationImg1} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center p-12">
                <div className="bg-white rounded-full px-8 py-6 flex items-center gap-4 w-full shadow-2xl">
                  <div className="w-8 h-8 rounded-full border-[3px] border-primary" />
                  <span className="text-2xl font-black text-black">{t("landing.features.easyScheduling")}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-8">
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#C32F00] leading-tight">
              {t("landing.features.title")}
            </h2>
            <p className="text-2xl md:text-3xl text-[#C32F00] opacity-80 max-w-lg">
              {t("landing.features.subtitle")}
            </p>
            <a href="/signin" className="block pt-8">
              <Button size="lg" className="rounded-full px-12 h-14 text-lg bg-[#C32F00] hover:bg-[#C32F00]/90 text-white font-bold">
                {t("landing.startFree")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Pinterest-style Section 2: Save */}
      <section className="py-32 bg-[#DAFFF6]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20">
          <div className="flex-1 space-y-8 text-center md:text-left text-[#006B6C]">
            <h2 className="text-5xl md:text-7xl font-serif font-bold leading-tight">
              {t("landing.features.availabilityControl")}
            </h2>
            <p className="text-2xl md:text-3xl opacity-80 max-w-lg">
              {t("landing.features.availabilityControlDesc")}
            </p>
            <a href="/signin" className="block pt-8">
              <Button size="lg" className="rounded-full px-12 h-14 text-lg bg-[#006B6C] hover:bg-[#006B6C]/90 text-white font-bold">
                {t("landing.startFree")}
              </Button>
            </a>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-6 scale-90 md:scale-100">
            <img src={equipmentImg1} className="rounded-[40px] shadow-2xl w-full translate-y-12" alt="" />
            <img src={venueImg1} className="rounded-[40px] shadow-2xl w-full" alt="" />
            <img src={haircutImg3} className="rounded-[40px] shadow-2xl w-full" alt="" />
            <img src={photoImg3} className="rounded-[40px] shadow-2xl w-full -translate-y-12" alt="" />
          </div>
        </div>
      </section>

      {/* Pinterest-style Section 3: See/Try */}
      <section className="py-32 bg-[#FFE2EB]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20">
          <div className="flex-1">
            <img src={classImg4} className="rounded-[60px] shadow-2xl w-full max-w-[500px] mx-auto aspect-square object-cover border-[12px] border-white" alt="" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-8 text-[#C31952]">
            <h2 className="text-5xl md:text-7xl font-serif font-bold leading-tight">
              {t("landing.features.customerManagement")}
            </h2>
            <p className="text-2xl md:text-3xl opacity-80 max-w-lg">
              {t("landing.features.customerManagementDesc")}
            </p>
            <a href="/signup" className="block pt-8">
              <Button size="lg" className="rounded-full px-12 h-14 text-lg bg-[#C31952] hover:bg-[#C31952]/90 text-white font-bold">
                {t("landing.startFree")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Pinterest-style Section 4: Shop */}
      <section className="py-32 bg-[#FAF9F7]">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-20">
          <div className="flex-1 space-y-8 text-center md:text-left text-black">
            <h2 className="text-5xl md:text-7xl font-serif font-bold leading-tight uppercase">
              {t("landing.features.simpleAnalytics")}
            </h2>
            <p className="text-2xl md:text-3xl opacity-70 max-w-lg font-medium">
              {t("landing.features.simpleAnalyticsDesc")}
            </p>
            <a href="/signup" className="block pt-8">
              <Button size="lg" className="rounded-full px-12 h-14 text-lg bg-black hover:bg-black/90 text-white font-bold uppercase tracking-wider">
                {t("landing.startFree")}
              </Button>
            </a>
          </div>
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 h-[500px]">
            <img src={venueImg5} className="rounded-3xl object-cover w-full h-full row-span-2" alt="" />
            <img src={haircutImg5} className="rounded-3xl object-cover w-full h-full" alt="" />
            <img src={classImg1} className="rounded-3xl object-cover w-full h-full" alt="" />
          </div>
        </div>
      </section>

      {/* Infinite Scroll "Explore" Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-center mb-16">{t("landing.explore.title")}</h2>
          <MasonryGrid columnCount={{ mobile: 2, tablet: 4, desktop: 6 }} gap={16} className="mb-12">
            {allServiceImages.slice(0, visibleItems).map((image, index) => (
              <PinCard
                key={index}
                image={image.src}
                title={image.category}
                aspectRatio={image.aspectRatio}
                onClick={() => window.location.href = "/signup"}
              />
            ))}
          </MasonryGrid>

          {/* Hide loader and prompt on mobile */}
          <div ref={loadMoreRef} className="h-40 flex items-center justify-center md:flex hidden">
            {isLoadingMore && visibleItems < allServiceImages.length ? (
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            ) : visibleItems < allServiceImages.length ? (
              <div className="text-gray-400 font-mono text-sm uppercase tracking-widest">Scroll to see more</div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Pinterest style footer-cap CTA */}
      <section className="py-40 bg-[#33B658] text-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-16">
          <h2 className="text-5xl md:text-8xl font-serif font-bold max-w-2xl text-center md:text-left leading-[0.9]">
            {t("landing.cta.title")}
          </h2>
          <div className="space-y-8 text-center md:text-right">
            <p className="text-3xl md:text-4xl opacity-90 max-w-md font-medium leading-tight">
              {t("landing.cta.subtitle")}
            </p>
            <a href="/signup" className="block pt-10">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full px-16 h-20 text-2xl font-black bg-white text-black hover:bg-white/90 shadow-2xl"
                data-testid="button-cta-signup"
              >
                {t("landing.cta.button")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-black text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 border-b border-white/20 pb-16 mb-16">
            <img src={flowlift_logo_Btext_noBG} alt="flowlift" className="h-10 invert brightness-0 invert shadow-none" />
            <nav className="flex flex-wrap justify-center items-center gap-12">
              <a href="/about" className="text-xl font-bold hover:text-primary transition-colors">{t("nav.about")}</a>
              <a href="/products" className="text-xl font-bold hover:text-primary transition-colors">{t("nav.products")}</a>
              <a href="/signin" className="text-xl font-bold hover:text-primary transition-colors">{t("landing.logIn")}</a>
            </nav>
            <div className="flex items-center gap-6">
              <LanguageSwitcher minimal />
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center opacity-40 text-sm gap-4">
            <p>&copy; 2026 flowlift. All rights reserved.</p>
            <p>{t("app.tagline")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
