"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens';

const CHANNELS = [
  { icon: Mail, label: "channelEmail", note: "noteEmail", value: "contact@q2m.tn", valueKey: undefined },
  { icon: Phone, label: "channelPhone", note: "notePhone", value: "", valueKey: "channelPhoneValue" },
  { icon: MapPin, label: "channelFlagship", note: "noteFlagship", value: "", valueKey: "channelFlagshipValue" },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ContactPage() {
  const t = useTranslations("contact");

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pt-24 pb-16 lg:px-14">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--q2m-accent-text)]"
        >
          {t("kicker")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="text-5xl font-black leading-none tracking-[-0.03em] md:text-7xl"
        >
          {t("titlePrefix")} <span className="text-accent">{t("titleAccent")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-xl leading-relaxed text-ink-soft"
        >
          {t("intro")}
        </motion.p>
      </section>

      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-5 sm:px-10 pb-24 lg:grid-cols-[1fr_1.2fr] lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col gap-4"
        >
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex items-start gap-4 p-5" style={{ background: Q2M.bgElevated }}>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center"
                  style={{ background: Q2M.accent, color: Q2M.bg }}
                >
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[10px] font-black tracking-[0.16em] text-ink-mute">{t(c.label)}</p>
                  <p className="mt-1 font-semibold">
                    {c.valueKey ? t(c.valueKey) : c.value}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-mute">
                    <Clock size={11} />
                    {t(c.note)}
                  </p>
                </div>
              </div>
            );
          })}

          <Link
            href="/about"
            className="group q2m-btn-primary"
          >
            {t("discoverCta")}
            <ArrowRight size={15} className="transition-transform duration-140 ease-q2m group-hover:translate-x-1 dir:rotate-180" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="p-8"
          style={{ background: Q2M.bgElevated }}
        >
          <ContactForm />
        </motion.div>
      </section>
    </main>
  );
}

function ContactForm() {
  const t = useTranslations("contact");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputStyle = {
    borderColor: Q2M.line,
    background: "transparent",
  } as const;

  if (sent) {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
        <span
          className="mb-5 flex h-14 w-14 items-center justify-center"
          style={{ background: Q2M.accent, color: Q2M.bg }}
        >
          ✓
        </span>
        <h2 className="text-2xl font-black">{t("sentTitle")}</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          {t("sentBody")}
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="mt-7 text-[10px] font-bold tracking-[0.16em] text-ink-mute transition-colors duration-140 ease-q2m hover:text-accent"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);

        const form = e.currentTarget;
        const payload = Object.fromEntries(new FormData(form).entries());

        try {
          const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            // La route renvoie un code (`missingFields`, `unexpected`), jamais un
            // texte : le message affiche doit suivre la langue active.
            setError(t(`error_${data?.error ?? 'unexpected'}`));
            return;
          }

          form.reset();
          setSent(true);
        } catch {
          setError(t('error_unexpected'));
        } finally {
          setPending(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-2 block text-[10px] font-bold tracking-[0.16em] text-ink-soft">
            {t("name")}
          </label>
          <input id="c-name" name="name" required placeholder={t("namePlaceholder")} className="h-12 w-full border px-4 text-sm outline-none transition-[border-color] duration-140 ease-q2m focus:border-accent" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-2 block text-[10px] font-bold tracking-[0.16em] text-ink-soft">
            {t("email")}
          </label>
          <input id="c-email" name="email" type="email" required placeholder={t("emailPlaceholder")} className="h-12 w-full border px-4 text-sm outline-none transition-[border-color] duration-140 ease-q2m focus:border-accent" style={inputStyle} />
        </div>
      </div>

      <div>
        <label htmlFor="c-subject" className="mb-2 block text-[10px] font-bold tracking-[0.16em] text-ink-soft">
          {t("subject")}
        </label>
        <input id="c-subject" name="subject" required placeholder={t("subjectPlaceholder")} className="h-12 w-full border px-4 text-sm outline-none transition-[border-color] duration-140 ease-q2m focus:border-accent" style={inputStyle} />
      </div>

      <div>
        <label htmlFor="c-message" className="mb-2 block text-[10px] font-bold tracking-[0.16em] text-ink-soft">
          {t("message")}
        </label>
        <textarea id="c-message" name="message" rows={6} required placeholder={t("messagePlaceholder")} className="w-full resize-none border px-4 py-3 text-sm outline-none transition-[border-color] duration-140 ease-q2m focus:border-accent" style={inputStyle} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="q2m-btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("sending") : t("sendCta")}
      </button>
      {error && (
        <p className="text-center text-xs text-alert">{error}</p>
      )}
      <p className="text-center text-[10px] font-bold tracking-[0.16em] text-ink-mute">
        {t("encrypted")}
      </p>
    </form>
  );
}