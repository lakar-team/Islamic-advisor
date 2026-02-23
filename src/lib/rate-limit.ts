const DAILY_LIMIT = 20; // Max 20 messages per day for free users
const STORAGE_KEY = 'sheikh_user_stats';

export interface UserStats {
    count: number;
    lastReset: number;
}

export const checkRateLimit = (): { allowed: boolean; remaining: number } => {
    const statsStr = localStorage.getItem(STORAGE_KEY);
    let stats: UserStats = statsStr ? JSON.parse(statsStr) : { count: 0, lastReset: Date.now() };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - stats.lastReset > oneDay) {
        stats = { count: 0, lastReset: now };
    }

    if (stats.count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: DAILY_LIMIT - stats.count };
};

export const incrementUsage = (): void => {
    const statsStr = localStorage.getItem(STORAGE_KEY);
    let stats: UserStats = statsStr ? JSON.parse(statsStr) : { count: 0, lastReset: Date.now() };

    stats.count += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};
