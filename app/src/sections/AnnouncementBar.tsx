import { motion } from 'framer-motion';
import { useSettings } from '@/hooks/useSettings';
import { useMemo, useState, useEffect } from 'react';
import { promotionsAPI } from '@/services/api';

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <span className="flex items-center gap-1.5 font-mono bg-black/10 px-2 py-0.5 rounded ml-2">
      <span className="text-[10px] opacity-60">FIN DANS:</span>
      <span className="text-xs font-bold">
        {timeLeft.d > 0 && `${timeLeft.d}j `}
        {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
      </span>
    </span>
  );
};

export default function AnnouncementBar() {
  const { settings } = useSettings();
  const [activePromos, setActivePromos] = useState<any[]>([]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const data = await promotionsAPI.getActive();
        setActivePromos(data.promotions || []);
      } catch (error) {
        console.error('Failed to fetch promos:', error);
      }
    };
    fetchPromos();
  }, []);

  const soonestPromo = useMemo(() => {
    if (!activePromos.length) return null;
    return activePromos.reduce((prev, curr) => 
      new Date(prev.endDate) < new Date(curr.endDate) ? prev : curr
    );
  }, [activePromos]);

  const announcements = useMemo(() => {
    let base = [];
    if (settings?.announcementText) {
      try {
        const parsed = typeof settings.announcementText === 'string' 
          ? JSON.parse(settings.announcementText) 
          : settings.announcementText;
        base = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error('Failed to parse announcements:', e);
      }
    }

    // Add promotion announcements
    activePromos.forEach(p => {
      if (p.announcementText) {
        base.push(p.announcementText);
      }
    });

    return base;
  }, [settings?.announcementText, activePromos]);

  if ((settings?.announcementEnabled === 0 || settings?.announcementEnabled === false) && !activePromos.length) {
    return null;
  }

  if (announcements.length === 0 && !soonestPromo) {
    return null;
  }

  return (
    <div 
      className="py-2 overflow-hidden relative z-[60] border-b border-[#3d4d5d]/10"
      style={{ 
        backgroundColor: settings?.announcementBgColor || '#fff4e9',
        color: settings?.announcementTextColor || '#3d4d5d'
      }}
    >
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{
            x: [0, -1000],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex gap-12 items-center"
        >
          {/* Repeat for seamless scrolling */}
          {[...announcements, ...announcements, ...announcements, ...announcements].map((text, index) => (
            <div key={index} className="flex items-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                {text}
              </span>
              {soonestPromo && index % announcements.length === 0 && (
                <CountdownTimer targetDate={soonestPromo.endDate} />
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

