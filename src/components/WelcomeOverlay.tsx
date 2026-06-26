import { useEffect, useState } from "react";

import { cn } from "../lib/utils";
import mark from "../assets/venturis-mark.png";

/**
 * Interactive welcome splash shown once per session right after sign-in.
 * Greets the user as "Welcome {salutation} {First Name}" then fades away.
 */
export function WelcomeOverlay({
  name,
  salutation,
  onDone,
}: {
  name: string;
  salutation?: string;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), 2200);
    const done = setTimeout(onDone, 2800);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-foreground text-background transition-opacity duration-500",
        leaving ? "opacity-0" : "opacity-100",
      )}
      aria-live="polite"
    >
      <div className="flex flex-col items-center px-6 text-center">
        <img
          src={mark}
          alt="Venturis"
          className="h-14 w-14 animate-[welcomePop_600ms_ease-out] rounded-xl"
        />

        <p className="mono-label mt-8 text-background/50 animate-[welcomeUp_700ms_ease-out_150ms_both]">
          Venturis Curation
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl animate-[welcomeUp_700ms_ease-out_300ms_both]">
          Welcome Bapak/Ibu {name}
        </h1>
        <p className="mt-3 text-sm text-background/60 animate-[welcomeUp_700ms_ease-out_450ms_both]">
          Preparing your venture pipeline…
        </p>

        <div className="mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-background/15">
          <div className="h-full w-full origin-left animate-[welcomeBar_2200ms_ease-in-out_forwards] bg-primary" />
        </div>
      </div>

      <style>{`
        @keyframes welcomePop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes welcomeUp {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes welcomeBar {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
