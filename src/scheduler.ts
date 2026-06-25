let activeTimer: NodeJS.Timeout | null = null;
let activeInterval: NodeJS.Timeout | null = null;

// Adjust target date to skip weekends (Saturday & Sunday -> Monday)
function adjustForWorkdays(targetDate: Date): void {
  const day = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 6) { // Saturday
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (day === 0) { // Sunday
    targetDate.setDate(targetDate.getDate() + 1);
  }
}

// Calculate milliseconds until next target hour (09:00, 13:00, 17:00) on a workday
function getNext3xDailyDelay(): number {
  const now = new Date();
  const currentHour = now.getHours();
  const targetHours = [9, 13, 17];
  
  let nextTarget = targetHours.find(h => h > currentHour);
  let targetDate = new Date(now);
  
  if (nextTarget !== undefined) {
    targetDate.setHours(nextTarget, 0, 0, 0);
  } else {
    targetDate.setDate(now.getDate() + 1);
    targetDate.setHours(9, 0, 0, 0);
  }
  
  adjustForWorkdays(targetDate);
  return targetDate.getTime() - now.getTime();
}

// Calculate milliseconds until next 09:00 AM on a workday
function getNextDailyDelay(): number {
  const now = new Date();
  const currentHour = now.getHours();
  let targetDate = new Date(now);
  
  if (currentHour < 9) {
    targetDate.setHours(9, 0, 0, 0);
  } else {
    targetDate.setDate(now.getDate() + 1);
    targetDate.setHours(9, 0, 0, 0);
  }
  
  adjustForWorkdays(targetDate);
  return targetDate.getTime() - now.getTime();
}

// Clear any existing active timer or interval
export function clearScheduler(): void {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
}

// Start or update the scheduler interval dynamically
export function updateScheduler(
  interval: 'hourly' | '3x-daily' | 'daily' | 'disabled',
  checkFunction: () => Promise<any>
): void {
  clearScheduler();
  
  if (interval === 'disabled') {
    console.log('[Scheduler] Background check scheduler is disabled.');
    return;
  }
  
  if (interval === 'hourly') {
    const intervalMs = 60 * 60 * 1000;
    console.log('[Scheduler] Hourly background scheduler registered.');
    activeInterval = setInterval(async () => {
      console.log('[Scheduler] Running hourly ISBN check...');
      try {
        await checkFunction();
      } catch (err) {
        console.error('[Scheduler] Error running hourly check:', err);
      }
    }, intervalMs);
    return;
  }
  
  let delay = 0;
  if (interval === '3x-daily') {
    delay = getNext3xDailyDelay();
    console.log(`[Scheduler] 3x-daily check scheduled. Next run in ${Math.round(delay / 1000 / 60)} minutes.`);
  } else if (interval === 'daily') {
    delay = getNextDailyDelay();
    console.log(`[Scheduler] Daily check scheduled. Next run in ${Math.round(delay / 1000 / 60)} minutes.`);
  } else {
    console.error(`[Scheduler] Unknown scheduler interval: ${interval}`);
    return;
  }
  
  activeTimer = setTimeout(async () => {
    console.log(`[Scheduler] Running scheduled ISBN check (interval: ${interval})...`);
    try {
      await checkFunction();
    } catch (err) {
      console.error('[Scheduler] Error during scheduled check:', err);
    }
    // Re-schedule next run dynamically
    updateScheduler(interval, checkFunction);
  }, delay);
}

// Start the scheduler on boot
export function startScheduler(
  interval: 'hourly' | '3x-daily' | 'daily' | 'disabled',
  checkFunction: () => Promise<any>
): void {
  console.log(`[Scheduler] Starting background scheduler on boot (interval: ${interval})...`);
  updateScheduler(interval, checkFunction);
}
