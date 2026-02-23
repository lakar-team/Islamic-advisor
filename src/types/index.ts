export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  references?: Array<{
    type: 'quran' | 'hadith';
    text: string;
    source: string;
  }>;
}

export interface UserStats {
  tokensUsed: number;
  lastInteraction: number;
  messageCount: number;
}
