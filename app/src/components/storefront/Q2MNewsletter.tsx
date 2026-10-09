"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from "@/lib/q2m-tokens";

type Status = "idle" | "loading" | "success" | "error";

export function Q2MNewsletter() {
  const t = useTranslations("home");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || pending || status === "loading" || status === "success") return;

    startTransition(async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value }),
        });
        setStatus(res.ok ? "success" : "error");
      } catch {
        setStatus("error");
      }
    });
  };

  return (
    <section
      id="newsletter"
      className="w-full"
      style={{
        background: Q2M.accent,
        color: Q2M.onAccent,
        fontFamily: Q2M_FONT,
      }}
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-10 px-5 py-14 sm:px-10 lg:grid-cols-2 lg:px-14 lg:py-20">
        {/* Heading */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-extrabold tracking-[0.16em] uppercase">
            {t('accesLabel')}
          </span>
          <h2 className="text-4xl font-black uppercase leading-[1.02] tracking-[-0.02em] lg:text-5xl">
            {t('accesHeading')}
          </h2>
        </div>

        {/* Form */}
        <div>
          {status === "success" ? (
            <div role="status" className="flex items-center gap-4 py-3">
              <Check size={24} strokeWidth={2.5} />
              <p className="text-lg font-extrabold tracking-[0.04em] uppercase">
                {t('accesSuccess')}
              </p>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col items-stretch gap-3 sm:flex-row"
              >
                <div
                  className="flex h-[44px] flex-1 items-center px-4"
                  style={{
                    background: Q2M.bgElevated,
                    border: "1px solid rgba(15,15,15,0.18)",
                    borderRadius: 4,
                  }}
                >
                  <input
                    type="email"
                    required
                    disabled={pending || status === "loading"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('accesPlaceholder')}
                    className="w-full bg-transparent text-sm font-bold tracking-[0.04em] uppercase placeholder:text-[var(--q2m-ink-mute)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ color: Q2M.ink }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={pending || status === "loading"}
                  className="group inline-flex h-[44px] shrink-0 items-center justify-center gap-2.5 px-6 text-xs font-bold tracking-[0.16em] uppercase transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q2m-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: Q2M.onAccent,
                    color: Q2M.bgElevated,
                    borderRadius: 4,
                  }}
                >
                  {t('accesSubmit')}
                  <ArrowRight size={14} strokeWidth={1.5} />
                </button>
              </form>
              {status === "error" && (
                <p role="alert" className="mt-3.5 text-[11px] font-bold leading-relaxed">
                  {t('accesError')}
                </p>
              )}
            </>
          )}
          <p
            className="mt-3.5 text-[11px] leading-relaxed"
            style={{ opacity: 0.7 }}
          >
            {t('accesNote')}
          </p>
        </div>
      </div>
    </section>
  );
}