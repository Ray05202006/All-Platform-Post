import { Platform, PLATFORM_LIMITS, SplitResult } from '@all-platform-post/shared';

/**
 * 特殊内容占位符
 */
interface SpecialContent {
  urls: string[];
  hashtags: string[];
  mentions: string[];
  text: string;
}

/**
 * 智能文本分割器
 */
export class TextSplitter {
  /**
   * 计算 Twitter 字符长度（特殊计算规则）
   * - 拉丁字母、数字、标点：1 字符
   * - 中日韩文字、表情符号：2 字符
   * - URL：固定 23 字符
   */
  private calculateTwitterLength(text: string): number {
    let length = 0;

    // 移除 URL（后面单独计算）
    const urls = text.match(/https?:\/\/\S+/g) || [];
    let textWithoutUrls = text;
    urls.forEach(url => {
      textWithoutUrls = textWithoutUrls.replace(url, '');
    });

    // 计算字符权重
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0)!;

      // 拉丁字符范围（1 字符）
      const isSingleWeight = (
        (code >= 0x0000 && code <= 0x10FF) || // 基本拉丁字母
        (code >= 0x2000 && code <= 0x200D) || // 标点符号
        (code >= 0x2010 && code <= 0x201F) || // 标点符号
        (code >= 0x2032 && code <= 0x2037)    // 引号等
      );

      length += isSingleWeight ? 1 : 2;
    }

    // URL 固定 23 字符
    length += urls.length * 23;

    return length;
  }

  /**
   * 计算通用字符长度
   */
  private calculateLength(text: string, platform: Platform): number {
    if (platform === 'twitter') {
      return this.calculateTwitterLength(text);
    }
    return text.length;
  }

  /**
   * 提取特殊内容（URL、Hashtag、Mention）
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

    // 替换为占位符
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
   * 还原特殊内容
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
   * 检测句子边界
   */
  private detectSentences(text: string): string[] {
    // 检测是否是中文文本
    const isChinese = /[\u4e00-\u9fa5]/.test(text);

    if (isChinese) {
      // 中文句子分割（按句号、问号、感叹号）
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
      // 英文句子分割（简单实现，可用 compromise.js 改进）
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
   * 智能分割文本
   */
  public split(text: string, platform: Platform): SplitResult {
    const config = PLATFORM_LIMITS[platform];
    const maxLength = config.maxLength;

    // 检查是否需要分割
    const totalLength = this.calculateLength(text, platform);
    if (totalLength <= maxLength) {
      return {
        platform,
        chunks: [text],
        needsSplitting: false,
      };
    }

    // 提取特殊内容
    const special = this.extractSpecialContent(text);

    // 句子边界检测
    const sentences = this.detectSentences(special.text);

    // 预留编号空间（如 " (1/5)" 约 7 字符）
    const reservedSpace = 10;
    const effectiveMaxLength = maxLength - reservedSpace;

    // 组合句子为分段
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const testText = currentChunk + sentence;
      const restoredTest = this.restoreSpecialContent(testText, special);
      const length = this.calculateLength(restoredTest, platform);

      if (length <= effectiveMaxLength) {
        currentChunk = testText;
      } else {
        // 当前句子太长，保存之前的内容
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // 检查单个句子是否超长
        const sentenceRestored = this.restoreSpecialContent(sentence, special);
        const sentenceLength = this.calculateLength(sentenceRestored, platform);

        if (sentenceLength <= effectiveMaxLength) {
          currentChunk = sentence;
        } else {
          // 句子本身太长，需要按字切分
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
              wordChunk = word;
            }
          }

          currentChunk = wordChunk;
        }
      }
    }

    // 添加最后一段
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // 还原特殊内容并添加编号
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
   * 批量分割（为多个平台生成分割结果）
   */
  public splitForPlatforms(text: string, platforms: Platform[]): SplitResult[] {
    return platforms.map(platform => this.split(text, platform));
  }
}

// 导出单例
export const textSplitter = new TextSplitter();
