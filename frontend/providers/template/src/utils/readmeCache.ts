class ReadmeCache {
  private cache: Map<string, string>;
  private readonly maxSize: number;

  constructor(maxSize: number = 10) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(url: string): string | null {
    if (!url) return null;

    const content = this.cache.get(url);
    if (content !== undefined) {
      this.cache.delete(url);
      this.cache.set(url, content);
      return content;
    }
    return null;
  }

  set(url: string, content: string): void {
    if (!url || !content) return;

    if (this.cache.has(url)) {
      this.cache.delete(url);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(url, content);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const readmeCache = new ReadmeCache(20);
