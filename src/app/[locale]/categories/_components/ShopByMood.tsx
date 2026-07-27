"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MoodItem = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

type ShopByMoodProps = {
  moods: MoodItem[];
  locale: string;
  activeMood?: string;
};

const labels = {
  en: {
    title: "Shop by Mood",
    subtitle: "Pick a mood and discover products that match the vibe",
    all: "All Moods",
  },
  si: {
    title: "මනෝභාවය අනුව මිලදී ගන්න",
    subtitle: "ඔබේ අද මනෝභාවයට ගැළපෙන තෑගි තෝරන්න",
    all: "සියලු මනෝභාව",
  },
};

export function ShopByMood({ moods, locale, activeMood }: ShopByMoodProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const copy = locale === "si" ? labels.si : labels.en;

  const updateMood = (moodSlug?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!moodSlug) {
      params.delete("mood");
    } else {
      params.set("mood", moodSlug);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <section className="rounded-2xl border border-brand-border bg-white p-5">
      <h2 className="text-xl font-bold text-[#1F1720]">{copy.title}</h2>
      <p className="mt-1 text-sm text-[#6B5A64]">{copy.subtitle}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateMood(undefined)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            !activeMood
              ? "border-[#A7066A] bg-[#A7066A] text-white"
              : "border-brand-border bg-white text-[#3A2B35] hover:border-[#A7066A]/40"
          }`}
        >
          {copy.all}
        </button>

        {moods.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => updateMood(mood.slug)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              activeMood === mood.slug
                ? "border-[#A7066A] bg-[#FCEAF4] text-[#A7066A]"
                : "border-brand-border bg-white text-[#3A2B35] hover:border-[#A7066A]/40"
            }`}
          >
            <span className="mr-1.5">{mood.icon || "✨"}</span>
            {mood.name}
          </button>
        ))}
      </div>
    </section>
  );
}
