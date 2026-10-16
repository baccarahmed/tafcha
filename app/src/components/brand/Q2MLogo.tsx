import Image from 'next/image';
import { Q2M, Q2M_BRAND_IMAGES } from '@/lib/q2m-tokens';

interface Q2MLogoProps {
  /** Côté en pixels (le badge est carré). */
  size?: number;
  /** Précharger (header / logo au-dessus de la ligne de flottaison). */
  priority?: boolean;
  className?: string;
}

/**
 * Emblème de marque unique : badge circulaire noir, fine liseré or, coins
 * transparents. Un seul asset pour toute la plateforme — navbar, footer,
 * admin, login. Choisir la variante se limite à ajuster `size`.
 */
export function Q2MLogo({ size = 48, priority = false, className = '' }: Q2MLogoProps) {
  return (
    <Image
      src={Q2M_BRAND_IMAGES.logoCircle}
      alt={`${Q2M.brand} — ${Q2M.brandFull}`}
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className={`block shrink-0 select-none rounded-full object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default Q2MLogo;
