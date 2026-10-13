"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from "@/lib/q2m-tokens";

/**
 * WebGL n'existe pas au rendu serveur : la scene 3D n'est chargee que cote
 * client. Le chunk reste hors du bundle initial de la page d'accueil.
 */
const ParticleSphere = dynamic(() => import("@/components/ui/particle-sphere"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden="true" />,
});

export function Q2MOrbitGallery({ images }: { images: string[] }) {
  const t = useTranslations("home");

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: Q2M.bgDark, fontFamily: Q2M_FONT }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-16 sm:px-10 lg:px-14 lg:py-20">
        <div className="flex flex-col gap-2">
          <span
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: Q2M.accent }}
          >
            {t("galleryKicker")}
          </span>
          <h2
            className="text-[clamp(28px,7vw,44px)] font-black uppercase leading-[1.1]"
            style={{ color: Q2M.onDark, letterSpacing: "-0.01em" }}
          >
            {t("galleryTitle")}
          </h2>
        </div>

        <div
          className="relative w-full"
          style={{ height: "clamp(420px, 68vh, 660px)" }}
        >
          <ParticleSphere images={images} className="absolute inset-0" />
        </div>
      </div>
    </section>
  );
}
