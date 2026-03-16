import { useState, useRef, useCallback } from 'react';

export type JackpotPhase = 'idle' | 'spinning' | 'settling' | 'done';

interface UseJackpotAnimationReturn {
  /** IDs currently lit up during animation */
  animatingIds: Set<string>;
  /** Final selected IDs after animation completes */
  finalIds: Set<string>;
  /** Current phase of the animation */
  phase: JackpotPhase;
  /** Start the jackpot animation */
  start: () => void;
  /** Reset back to idle */
  reset: () => void;
}

/**
 * Hook that simulates a "jackpot slot machine" animation over a set of location IDs.
 *
 * 1. Pre-selects `targetCount` random locations as the final result
 * 2. During ~5s, cycles through random subsets at decreasing speed:
 *    - 0–3s: every 80ms (fast spin)
 *    - 3–4.5s: every 200ms (slowing)
 *    - 4.5–5s: every 400ms (settling)
 * 3. Lands on the pre-selected locations → phase = 'done'
 */
export function useJackpotAnimation(
  allLocationIds: string[],
  targetCount: number,
): UseJackpotAnimationReturn {
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [finalIds, setFinalIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<JackpotPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);

  const pickRandom = useCallback(
    (count: number): Set<string> => {
      const pool = [...allLocationIds];
      const picked = new Set<string>();
      const n = Math.min(count, pool.length);
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.add(pool[idx]);
        pool.splice(idx, 1);
      }
      return picked;
    },
    [allLocationIds],
  );

  const start = useCallback(() => {
    if (allLocationIds.length === 0 || targetCount <= 0) return;

    // Pre-select final result
    const selected = pickRandom(targetCount);
    setFinalIds(selected);
    setPhase('spinning');
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;

      if (elapsed >= 5000) {
        // Done — show final selection
        setAnimatingIds(selected);
        setPhase('done');
        return;
      }

      // Pick a random subset to light up
      setAnimatingIds(pickRandom(targetCount));

      // Determine next interval based on elapsed time
      let interval: number;
      if (elapsed < 3000) {
        interval = 80;
      } else if (elapsed < 4500) {
        interval = 200;
        setPhase('settling');
      } else {
        interval = 400;
        setPhase('settling');
      }

      timerRef.current = setTimeout(tick, interval);
    };

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    tick();
  }, [allLocationIds, targetCount, pickRandom]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnimatingIds(new Set());
    setFinalIds(new Set());
    setPhase('idle');
  }, []);

  return { animatingIds, finalIds, phase, start, reset };
}
