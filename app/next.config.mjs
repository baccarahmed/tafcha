import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Racine du workspace Next.
 *
 * Le depot vit sous Q2M/tafcha/app ; au-dessus, d'autres lockfiles peuvent
 * exister, ce qui faisait deviner a Next un workspace root errone (warning
 * « inferred your workspace root »). On le fixe explicitement pour que le
 * tracing de build reste borne a ce dossier.
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Domaines tiers autorises.
 *
 * - 47eeq5ju.us-east.insforge.app et cdn.insforge.dev : InsForge Storage.
 *   Les objets sont lus via l'hote CDN signe renvoye par le SDK, pas via le
 *   bucket brut — les deux doivent donc figurer dans img-src.
 * - coresg-normal.trae.ai : generateur de visuels de campagne. Il repond
 *   par une 301 vers lf-cdn.trae.ai, et le CSP re-verifie l'autorisation
 *   apres chaque redirection : le CDN de destination doit etre liste lui
 *   aussi, sinon les images sont bloquees malgre l'hote d'origine.
 * - connect.facebook.net / www.facebook.com : Meta Pixel, injecte uniquement
 *   apres consentement (src/components/analytics/MetaPixel.tsx).
 */
const CDN = 'https://47eeq5ju.us-east.insforge.app';
const CDN_HOSTED = 'https://cdn.insforge.dev';
const CAMPAIGN = 'https://coresg-normal.trae.ai';
const CAMPAIGN_CDN = 'https://lf-cdn.trae.ai';
const FB_SCRIPT = 'https://connect.facebook.net';
const FB_IMAGE = 'https://www.facebook.com';

/**
 * CSP sans nonce : Next s'appuie sur des scripts inline au rendu, on autorise
 * donc 'unsafe-inline' — la defense reste utile contre les injections via
 * attribut `href`, les datas: forgees et les domains exernes non prevus.
 * En developpement HMR a besoin d'unsafe-eval et du ws: du bundle server.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${FB_SCRIPT}${isDev ? " 'unsafe-eval'" : ''}`,
  // `script-src-attr 'none'` bloque les gestionnaires d'evenements inline
  // (onclick=..., onerror=...) sans casser les scripts inline legitimes de
  // Next (bootstrap + themeScript) qui passent par script-src.
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${CDN} ${CDN_HOSTED} ${CAMPAIGN} ${CAMPAIGN_CDN} ${FB_IMAGE}`,
  "font-src 'self' data:",
  `connect-src 'self' ${CDN} ${CDN_HOSTED} ${CAMPAIGN} ${CAMPAIGN_CDN} ${FB_SCRIPT} ${FB_IMAGE}${isDev ? ' ws:' : ''}`,
  `frame-src ${FB_IMAGE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // Recommandation Firefox : freine le cross-site tracking et protege les
  // iframes imbriquees tierces.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // HSTS delivre par le navigateur : l'operateur doit pouvoir le tester en
  // http sur localhost, on le pousse donc hors developpement.
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]),
];

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: rootDir,
  turbopack: {
    root: rootDir,
  },
  // next/link affiche `Next.js` en en-tete : inutilement revele le framework.
  poweredByHeader: false,
  images: {
    // Formats modernes servis automatiquement aux navigateurs compatibles.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coresg-normal.trae.ai',
        pathname: '/api/ide/v1/text_to_image',
      },
      // Visuels produits servis depuis InsForge Storage.
      {
        protocol: 'https',
        hostname: '47eeq5ju.us-east.insforge.app',
        pathname: '/**',
      },
      // L'upload renvoie une URL signee sur le CDN InsForge : c'est elle qui
      // est stockee en base, donc celle qui arrive au navigateur.
      {
        protocol: 'https',
        hostname: 'cdn.insforge.dev',
        pathname: '/storage/**',
      },
      // Visuels de campagne : l'API repond par une 301 vers ce CDN.
      {
        protocol: 'https',
        hostname: 'lf-cdn.trae.ai',
        pathname: '/obj/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Applies to every page, API route and asset.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
