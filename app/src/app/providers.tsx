'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
            classNames: {
              toast:
                'bg-card border border-line text-foreground backdrop-blur-xl bg-opacity-80 shadow-glass-card',
            },
          }}
      />
    </ThemeProvider>
  );
}
