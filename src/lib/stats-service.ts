export interface SiteStats {
    total_visitors: number;
    questions_answered: number;
    country_counts: Record<string, number>;
}

export interface Review {
    id: string;
    name: string;
    text: string;
    timestamp: number;
}

export const statsService = {
    async fetchStats(): Promise<SiteStats | null> {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) return await response.json();
        } catch (e) {
            console.error('Failed to fetch stats:', e);
        }
        return null;
    },

    async trackVisit(): Promise<void> {
        try {
            await fetch('/api/stats?action=track_visit', { method: 'POST' });
        } catch (e) {
            console.error('Failed to track visit:', e);
        }
    },

    async fetchReviews(): Promise<Review[]> {
        try {
            const response = await fetch('/api/reviews');
            if (response.ok) return await response.json();
        } catch (e) {
            console.error('Failed to fetch reviews:', e);
        }
        return [];
    },

    async addReview(name: string, text: string): Promise<Review | null> {
        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, text })
            });
            if (response.ok) return await response.json();
        } catch (e) {
            console.error('Failed to add review:', e);
        }
        return null;
    }
};
