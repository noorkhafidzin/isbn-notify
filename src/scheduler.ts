let activeTimer: NodeJS.Timeout | null = null;

// Adjust target date to skip weekends (Saturday & Sunday -> Monday)
function adjustForWorkdays(targetDate: Date): void {
  const day = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 6) { // Saturday
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (day === 0) { // Sunday
    targetDate.setDate(targetDate.getDate() + 1);
  }
}

// Calculate milliseconds until the next target hour from the hours list on a workday
function getNextCustomDelay(hours: number[]): number {
  if (!hours || hours.length === 0) {
    hours = [9, 13, 17]; // Fallback defaults
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // Sort hours ascending
  const sortedHours = [...hours].sort((a, b) => a - b);
  
  // Find the next target hour today
  let nextTarget = sortedHours.find(h => h > currentHour);
  let targetDate = new Date(now);
  
  if (nextTarget !== undefined) {
    targetDate.setHours(nextTarget, 0, 0, 0);
  } else {
    // Next target is the first hour tomorrow
    targetDate.setDate(now.getDate() + 1);
    targetDate.setHours(sortedHours[0], 0, 0, 0);
  }
  
  adjustForWorkdays(targetDate);
  return targetDate.getTime() - now.getTime();
}

// Clear any existing active timer
export function clearScheduler(): void {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
}

// Start or update the scheduler interval dynamically
export function updateScheduler(
  interval: 'custom' | 'disabled',
  checkFunction: () => Promise<any>,
  hours: number[] = [9, 13, 17]
): void {
  clearScheduler();
  
  if (interval === 'disabled') {
    console.log('[Scheduler] Background check scheduler is disabled.');
    return;
  }
  
  if (interval === 'custom') {
    const delay = getNextCustomDelay(hours);
    const sortedHours = [...hours].sort((a, b) => a - b);
    console.log(`[Scheduler] Custom check scheduled for hours: [${sortedHours.join(', ')}]. Next run in ${Math.round(delay / 1000 / 60)} minutes.`);
    
    activeTimer = setTimeout(async () => {
      console.log(`[Scheduler] Running scheduled ISBN check (custom hours: [${sortedHours.join(', ')}])...`);
      try {
        await checkFunction();
      } catch (err) {
        console.error('[Scheduler] Error during scheduled check:', err);
      }
      // Re-schedule next run dynamically
      updateScheduler(interval, checkFunction, hours);
    }, delay);
    return;
  }
  
  console.error(`[Scheduler] Unknown scheduler interval: ${interval}`);
}

// Start the scheduler on boot
export function startScheduler(
  interval: 'custom' | 'disabled',
  checkFunction: () => Promise<any>,
  hours: number[] = [9, 13, 17]
): void {
  console.log(`[Scheduler] Starting background scheduler on boot (interval: ${interval}, hours: [${hours.join(', ')}])...`);
  updateScheduler(interval, checkFunction, hours);
}
