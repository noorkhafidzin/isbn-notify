let activeTimer: NodeJS.Timeout | null = null;

function getNextCustomDelay(times: string[]): number {
  if (!times || times.length === 0) {
    times = ['09:00', '13:00', '17:00'];
  }

  const now = new Date();
  const nowMs = now.getTime();

  // Sort lexicographically — 'HH:MM' sorts correctly as strings
  const sorted = [...times].sort();

  for (const t of sorted) {
    const [h, m] = t.split(':').map(Number);
    const candidate = new Date(now);
    candidate.setHours(h, m, 0, 0);
    if (candidate.getTime() > nowMs) {
      const delay = candidate.getTime() - nowMs;
      console.log(`[Scheduler] Next check scheduled at ${candidate.toISOString()} (in ${Math.round(delay / 1000)}s)`);
      return delay;
    }
  }

  // All times passed today → first time tomorrow
  const [h, m] = sorted[0].split(':').map(Number);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(h, m, 0, 0);
  const delay = tomorrow.getTime() - nowMs;
  console.log(`[Scheduler] All today's checks passed. Next check at ${tomorrow.toISOString()} (in ${Math.round(delay / 1000)}s)`);
  return delay;
}

export function clearScheduler(): void {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
    console.log('[Scheduler] Timer cleared.');
  }
}

export function updateScheduler(
  interval: 'custom' | 'disabled',
  checkFunction: () => Promise<any>,
  times: string[] = ['09:00', '13:00', '17:00']
): void {
  clearScheduler();

  if (interval === 'disabled') {
    console.log('[Scheduler] Background check scheduler is disabled.');
    return;
  }

  if (interval === 'custom') {
    const delay = getNextCustomDelay(times);
    const sorted = [...times].sort();
    console.log(`[Scheduler] Custom check times: [${sorted.join(', ')}]. Next run in ${Math.round(delay / 1000 / 60)} minutes.`);

    activeTimer = setTimeout(async () => {
      console.log(`[Scheduler] Running scheduled ISBN check (times: [${sorted.join(', ')}])...`);
      try {
        await checkFunction();
        console.log('[Scheduler] Scheduled check completed.');
      } catch (err) {
        console.error('[Scheduler] Error during scheduled check:', err);
      }
      console.log('[Scheduler] Re-scheduling next check...');
      updateScheduler(interval, checkFunction, times);
    }, delay);
    return;
  }

  console.error(`[Scheduler] Unknown scheduler interval: ${interval}`);
}

export function startScheduler(
  interval: 'custom' | 'disabled',
  checkFunction: () => Promise<any>,
  times: string[] = ['09:00', '13:00', '17:00']
): void {
  const sorted = [...times].sort();
  console.log(`[Scheduler] Starting background scheduler (interval: ${interval}, times: [${sorted.join(', ')}])...`);
  updateScheduler(interval, checkFunction, times);
}
