'use client'

/**
 * Meta Pixel de base.
 *
 * Le script n'est injecté qu'après consentement explicite (`accepted`) ET si un
 * ID est configuré. Le `PageView` initial part avec le snippet ; les
 * navigations suivantes (SPA) sont trackées via l'effet ci-dessous.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react'
import Script from 'next/script'
import { usePathname } from '@/i18n/navigation'
import { META_PIXEL_ID } from '@/lib/site'
import { getConsent, subscribeConsent } from '@/lib/consent'
import { trackPageView } from '@/lib/metaPixel'

export default function MetaPixel() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null)
  const pathname = usePathname()
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    trackPageView()
  }, [pathname])

  if (consent !== 'accepted' || !META_PIXEL_ID) return null

  const baseCode = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${META_PIXEL_ID}');
    fbq('track', 'PageView');
  `

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {baseCode}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}