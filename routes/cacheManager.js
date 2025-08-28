const crypto = require('crypto');

class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.hitCount = 0;
    this.missCount = 0;
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  generateKey(prompt, modelType, temperature, contextHash = '') {
    const data = `${prompt}|${modelType}|${temperature}|${contextHash}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateContextHash(context) {
    if (!context) return '';
    
    const contextString = JSON.stringify({
      contextDocs: context.contextDocs || '',
      userContext: context.userContext || '',
      previousResults: context.previousResults || [],
    });
    
    return crypto.createHash('md5').update(contextString).digest('hex');
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    const expiresAt = Date.now() + ttl;
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    entry.hitCount++;
    this.hitCount++;
    
    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  has(key) {
    const entry = this.cache.get(key);
    return entry && Date.now() <= entry.expiresAt;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests,
    };
  }

  // Cache similar prompts with fuzzy matching
  findSimilarCachedResult(prompt, modelType, temperature, threshold = 0.8) {
    const promptWords = prompt.toLowerCase().split(/\s+/);
    
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expiresAt) continue;
      
      // Extract original prompt from cached metadata if available
      if (entry.metadata && entry.metadata.originalPrompt) {
        const cachedWords = entry.metadata.originalPrompt.toLowerCase().split(/\s+/);
        const similarity = this.calculateSimilarity(promptWords, cachedWords);
        
        if (similarity >= threshold && 
            entry.metadata.modelType === modelType && 
            Math.abs(entry.metadata.temperature - temperature) < 0.1) {
          
          console.log(`Found similar cached result with ${(similarity * 100).toFixed(1)}% similarity`);
          return entry.value;
        }
      }
    }
    
    return null;
  }

  calculateSimilarity(words1, words2) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Enhanced set method with metadata
  setWithMetadata(key, value, metadata, customTtl = null) {
    const ttl = customTtl || this.ttl;
    const expiresAt = Date.now() + ttl;
    
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      hitCount: 0,
      metadata,
    });
  }

  // Preemptive cache warming for common patterns
  async warmCache(commonPrompts, modelTypes, temperatures) {
    console.log('Starting cache warming...');
    
    for (const prompt of commonPrompts) {
      for (const modelType of modelTypes) {
        for (const temperature of temperatures) {
          const key = this.generateKey(prompt, modelType, temperature);
          
          if (!this.has(key)) {
            // This would be called with actual AI generation in practice
            // For now, we just mark the patterns as known
            this.setWithMetadata(key, null, {
              originalPrompt: prompt,
              modelType,
              temperature,
              warmed: true,
            }, this.ttl * 2); // Longer TTL for warmed entries
          }
        }
      }
    }
    
    console.log('Cache warming completed');
  }

  // Intelligent cache invalidation
  invalidateByPattern(pattern) {
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata && entry.metadata.originalPrompt) {
        if (entry.metadata.originalPrompt.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }

  // Export cache for persistence
  export() {
    const exportData = {
      timestamp: Date.now(),
      stats: this.getStats(),
      entries: [],
    };
    
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() <= entry.expiresAt) {
        exportData.entries.push({
          key,
          value: entry.value,
          expiresAt: entry.expiresAt,
          metadata: entry.metadata,
        });
      }
    }
    
    return exportData;
  }

  // Import cache from persistence
  import(data) {
    if (!data || !data.entries) return;
    
    const now = Date.now();
    let importedCount = 0;
    
    for (const entry of data.entries) {
      if (now <= entry.expiresAt) {
        this.cache.set(entry.key, {
          value: entry.value,
          expiresAt: entry.expiresAt,
          createdAt: now,
          hitCount: 0,
          metadata: entry.metadata,
        });
        importedCount++;
      }
    }
    
    console.log(`Imported ${importedCount} cache entries`);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

module.exports = CacheManager;