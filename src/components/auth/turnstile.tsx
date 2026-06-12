import { useEffect, useRef } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    // Dynamically insert Turnstile script if it doesn't exist yet
    if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    let widgetId: string | null = null;

    const renderWidget = () => {
      if (window.turnstile && containerRef.current) {
        try {
          widgetId = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onVerify(token);
            },
            'expired-callback': () => {
              if (onExpire) onExpire();
            },
            'error-callback': () => {
              if (onError) onError();
            },
          });
        } catch (e) {
          console.error('Error rendering Turnstile:', e);
        }
      } else {
        // Retry rendering when turnstile script is fully loaded
        setTimeout(renderWidget, 100);
      }
    };

    renderWidget();

    return () => {
      // Cleanup widget on unmount if it was rendered
      if (window.turnstile && widgetId) {
        try {
          // Some versions of Turnstile don't require manual remove, but we can reset or let it gc
        } catch (e) {
          console.warn('Failed to cleanup Turnstile widget:', e);
        }
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  if (!siteKey) return null;

  return (
    <div className="flex justify-center my-4 overflow-hidden rounded-xl">
      <div ref={containerRef} />
    </div>
  );
}
export default Turnstile;
