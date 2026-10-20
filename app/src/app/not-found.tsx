import Link from 'next/link';

/**
 * 404 pour toute URL hors arbre localisé (/fr/…, /shop inconnu, etc.).
 * Next rend ce fichier sans root layout ni contexte i18n : libellés
 * bilingues courts, styles inline (globals.css n'est pas chargé ici),
 * lien vers / que le middleware relocalise vers la bonne locale.
 */
export default function RootNotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: '96px 24px',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#f4f4f0',
        color: '#080909',
      }}
    >
      <p style={{ fontSize: 12, letterSpacing: '0.3em', color: '#737373' }}>404</p>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Page introuvable</h1>
      <p style={{ color: '#525252', margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
        Cette page n&apos;existe pas ou a été déplacée.
        <br />
        This page doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          borderRadius: 9999,
          background: '#080909',
          color: '#f4f4f0',
          padding: '12px 24px',
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        Q2M — Retour à la boutique / Back to the shop
      </Link>
    </main>
  );
}
