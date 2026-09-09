import { type PropsWithChildren, type ReactNode, useEffect, useState } from "react";

type DeferredAccountSectionProps = PropsWithChildren<{
  fallback: ReactNode;
  frames?: number;
}>;

/**
 * Keeps collection subscriptions and expensive native section trees out of the
 * navigation frame. The fallback is committed with the Account shell, then the
 * real section mounts when the JS thread is idle (or shortly after the timeout).
 */
export default function DeferredAccountSection({
  children,
  fallback,
  frames = 0,
}: DeferredAccountSectionProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const frameIds: number[] = [];

    const idleId = requestIdleCallback(
      () => {
        const mount = (remainingFrames: number) => {
          if (cancelled) return;
          if (remainingFrames <= 0) {
            setIsReady(true);
            return;
          }

          frameIds.push(requestAnimationFrame(() => mount(remainingFrames - 1)));
        };

        mount(frames);
      },
      { timeout: 750 },
    );

    return () => {
      cancelled = true;
      cancelIdleCallback(idleId);
      for (const frameId of frameIds) cancelAnimationFrame(frameId);
    };
  }, [frames]);

  return isReady ? children : fallback;
}
