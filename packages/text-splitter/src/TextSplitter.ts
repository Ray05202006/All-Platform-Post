import { Platform, PLATFORM_LIMITS, SplitResult } from '@all-platform-post/shared';

/**
 * 特殊內容佔位符
 */
interface SpecialContent {
  urls: string[];
  hashtags: string[];
  mentions: string[];
  text: string;
}

/**
 * 智慧文字分割器
 */
export class TextSplitter {
  /**
   * 計算 Twitter 字元長度（特殊計算規則）
   * - 拉丁字母、數字、標點：1 字元
   * - 中日韓文字、表情符號：2 字元
   * - URL：固定 23 字元
   */
  private calculateTwitterLength(text: string): number {
    let length = 0;

    // 移除 URL（後面單獨計算）
    const urls = text.match(/https?:\/\/\S+/g) || [];
    let textWithoutUrls = text;
    urls.forEach(url => {
      textWithoutUrls = textWithoutUrls.replace(url, '');
    });

    // 計算字元權重
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0)!;

      // 拉丁字元範圍（1 字元）
      const isSingleWeight = (
        (code >= 0x0000 && code <= 0x10FF) || // 基本拉丁字母
        (code >= 0x2000 && code <= 0x200D) || // 標點符號
        (code >= 0x2010 && code <= 0x201F) || // 標點符號
        (code >= 0x2032 && code <= 0x2037)    // 引號等
      );

      length += isSingleWeight ? 1 : 2;
    }

    // URL 固定 23 字元
    length += urls.length * 23;

    return length;
  }

  /**
   * 計算通用字元長度
   */
  private calculateLength(text: string, platform: Platform): number {
    if (platform === 'twitter') {
      return this.calculateTwitterLength(text);
    }
    return text.length;
  }

  /**
   * 提取特殊內容（URL、Hashtag、Mention）
   */
  private extractSpecialContent(text: string): SpecialContent {
    const urls: string[] = [];
    const hashtags: string[] = [];
    const mentions: string[] = [];

    // 提取 URL
    const urlRegex = /https?:\/\/\S+/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      urls.push(match[0]);
    }

    // 提取 Hashtag
    const hashtagRegex = /#[\w\u4e00-\u9fa5]+/g;
    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[0]);
    }

    // 提取 Mention
    const mentionRegex = /@[\w\u4e00-\u9fa5]+/g;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[0]);
    }

    // 替換為佔位符
    let processedText = text;
    urls.forEach((url, i) => {
      processedText = processedText.replace(url, `__URL_${i}__`);
    });
    hashtags.forEach((tag, i) => {
      processedText = processedText.replace(tag, `__TAG_${i}__`);
    });
    mentions.forEach((mention, i) => {
      processedText = processedText.replace(mention, `__MENTION_${i}__`);
    });

    return { urls, hashtags, mentions, text: processedText };
  }

  /**
   * 還原特殊內容
   */
  private restoreSpecialContent(text: string, special: SpecialContent): string {
    let restored = text;

    special.urls.forEach((url, i) => {
      restored = restored.replace(`__URL_${i}__`, url);
    });
    special.hashtags.forEach((tag, i) => {
      restored = restored.replace(`__TAG_${i}__`, tag);
    });
    special.mentions.forEach((mention, i) => {
      restored = restored.replace(`__MENTION_${i}__`, mention);
    });

    return restored;
  }

  /**
   * 檢測句子邊界
   */
  private detectSentences(text: string): string[] {
    // 檢測是否是中文文字
    const isChinese = /[\u4e00-\u9fa5]/.test(text);

    if (isChinese) {
      // 中文句子分割（按句號、問號、感嘆號）
      return text
        .split(/([。!?！？\n]+)/)
        .filter(s => s.trim())
        .reduce((acc, curr, i, arr) => {
          if (i % 2 === 0) {
            const punctuation = arr[i + 1] || '';
            acc.push(curr + punctuation);
          }
          return acc;
        }, [] as string[]);
    } else {
      // 英文句子分割（簡單實現，可用 compromise.js 改進）
      return text
        .split(/([.!?\n]+\s+)/)
        .filter(s => s.trim())
        .reduce((acc, curr, i, arr) => {
          if (i % 2 === 0) {
            const punctuation = arr[i + 1] || '';
            acc.push(curr + punctuation);
          }
          return acc;
        }, [] as string[]);
    }
  }

  /**
   * 智慧分割文字
   */
  public split(text: string, platform: Platform): SplitResult {
    const config = PLATFORM_LIMITS[platform];
    const maxLength = config.maxLength;

    // 檢查是否需要分割
    const totalLength = this.calculateLength(text, platform);
    if (totalLength <= maxLength) {
      return {
        platform,
        chunks: [text],
        needsSplitting: false,
      };
    }

    // 提取特殊內容
    const special = this.extractSpecialContent(text);

    // 句子邊界檢測
    const sentences = this.detectSentences(special.text);

    // 預留編號空間（如 " (1/5)" 約 7 字元）
    const reservedSpace = 10;
    const effectiveMaxLength = maxLength - reservedSpace;

    // 組合句子為分段
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const testText = currentChunk + sentence;
      const restoredTest = this.restoreSpecialContent(testText, special);
      const length = this.calculateLength(restoredTest, platform);

      if (length <= effectiveMaxLength) {
        currentChunk = testText;
      } else {
        // 當前句子太長，儲存之前的內容
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // 檢查單個句子是否超長
        const sentenceRestored = this.restoreSpecialContent(sentence, special);
        const sentenceLength = this.calculateLength(sentenceRestored, platform);

        if (sentenceLength <= effectiveMaxLength) {
          currentChunk = sentence;
        } else {
          // 句子本身太長，需要按字切分
          const words = sentence.split(/(\s+)/);
          let wordChunk = '';

          for (const word of words) {
            const testWord = wordChunk + word;
            const restoredWord = this.restoreSpecialContent(testWord, special);
            const wordLength = this.calculateLength(restoredWord, platform);

            if (wordLength <= effectiveMaxLength) {
              wordChunk = testWord;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              // 단어 자체가 너무 길면 문자 단위로 분할 (CJK 연속 텍스트 대응)
              if (this.calculateLength(this.restoreSpecialContent(word, special), platform) > effectiveMaxLength) {
                for (const char of word) {
                  const testChar = wordChunk + char;
                  const restoredChar = this.restoreSpecialContent(testChar, special);
                  if (this.calculateLength(restoredChar, platform) <= effectiveMaxLength) {
                    wordChunk = testChar;
                  } else {
                    if (wordChunk) chunks.push(wordChunk);
                    wordChunk = char;
                  }
                }
              } else {
                wordChunk = word;
              }
            }
          }

          currentChunk = wordChunk;
        }
      }
    }

    // 新增最後一段
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // 還原特殊內容並新增編號
    const restoredChunks = chunks.map((chunk, i) => {
      const restored = this.restoreSpecialContent(chunk, special);
      const totalChunks = chunks.length;

      if (totalChunks > 1) {
        return `${restored.trim()} (${i + 1}/${totalChunks})`;
      }
      return restored.trim();
    });

    return {
      platform,
      chunks: restoredChunks,
      needsSplitting: true,
    };
  }

  /**
   * 批次分割（為多個平臺生成分割結果）
   */
  public splitForPlatforms(text: string, platforms: Platform[]): SplitResult[] {
    return platforms.map(platform => this.split(text, platform));
  }
}

// 匯出單例
export const textSplitter = new TextSplitter();
