export const TEST_POSTS = {
  short: 'This is a short test post.',
  medium: 'This is a medium-length test post that contains more content but still fits within most platform limits.',
  long: 'A'.repeat(300),
  twitterMax: 'This is exactly at the Twitter character limit. '.repeat(5).slice(0, 280),
  withHashtags: 'Check out this amazing post! #testing #e2e #playwright #automation',
  withUrl: 'Check out https://example.com for more information about our product!',
  withMention: 'Thanks @testuser for the great feedback on our project!',
  chinese: '這是一條中文測試貼文，用於測試字元計算功能是否正確處理中文字元。',
  mixed: 'Hello 你好 World 世界! Testing mixed content with #hashtags and https://example.com',
  emoji: 'Great news! 🎉 Our new feature is live! 🚀 Check it out! ✨',
};

export const PLATFORMS = {
  all: ['facebook', 'instagram', 'twitter', 'threads'] as const,
  facebook: 'facebook' as const,
  instagram: 'instagram' as const,
  twitter: 'twitter' as const,
  threads: 'threads' as const,
};

export const PLATFORM_LIMITS = {
  facebook: 63206,
  instagram: 2200,
  twitter: 280,
  threads: 500,
};

export const PLATFORM_ICONS = {
  facebook: '📘',
  instagram: '📷',
  twitter: '🐦',
  threads: '🧵',
};

export const SELECTORS = {
  contentTextarea: 'textarea[placeholder="輸入貼文內容..."]',

  platformLabel: (platform: string) => `label:has-text("${getPlatformDisplayName(platform)}")`,
  platformCheckbox: (platform: string) => `input[type="checkbox"][value="${platform}"]`,

  publishButton: 'button:has-text("立即釋出")',
  scheduleButton: 'button:has-text("排程釋出")',
  saveDraftButton: 'button:has-text("儲存草稿")',

  scheduleToggle: 'text=設定排程',
  scheduleDateInput: 'input[type="datetime-local"]',

  mediaUploadButton: 'button:has-text("+")',
  mediaPreview: '.w-20.h-20 img',
  mediaRemoveButton: 'button:has-text("×")',

  // Navigation links (short form in navbar) - use nav context
  navDashboard: 'nav a:has-text("發文")',
  navScheduled: 'nav a:has-text("排程")',
  navHistory: 'nav a:has-text("歷史")',
  navSettings: 'nav a:has-text("設定")',

  connectButton: 'button:has-text("連線")',
  disconnectButton: 'button:has-text("斷開連線")',

  filterAll: 'button:has-text("全部")',
  filterDraft: 'button:has-text("草稿")',
  filterScheduled: 'button:has-text("已排程")',
  filterPublished: 'button:has-text("已釋出")',
  filterFailed: 'button:has-text("失敗")',

  retryButton: 'button:has-text("重試釋出")',
  deleteButton: 'button:has-text("刪除")',
  editTimeButton: 'button:has-text("修改時間")',
  cancelScheduleButton: 'button:has-text("取消排程")',

  heading: {
    dashboard: 'h2:has-text("發文編輯器")',
    scheduled: 'h1:has-text("排程管理")',
    history: 'h1:has-text("發文歷史")',
    settings: 'h2:has-text("設定")',
  },

  emptyState: {
    scheduled: 'text=暫無排程貼文',
    history: 'text=暫無貼文記錄',
    noPlatforms: 'text=尚未連線任何平臺',
  },
};

function getPlatformDisplayName(platform: string): string {
  const names: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'Twitter',
    threads: 'Threads',
  };
  return names[platform] || platform;
}

export function getFutureDate(hoursFromNow: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
}

export function formatDateTimeLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export function getMinScheduleDate(): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 6);
  return date;
}
