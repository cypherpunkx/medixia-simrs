/**
 * High-Performance In-Memory Cache Tier
 * Implements Cache-Aside pattern with TTL, Namespace Invalidation, and Telemetry
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private static store = new Map<string, CacheEntry<any>>();
  private static hits = 0;
  private static misses = 0;

  /**
   * Retrieve item from cache if not expired
   */
  public static get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Set item in cache with TTL in milliseconds (default: 30 seconds)
   */
  public static set<T>(key: string, value: T, ttlMs: number = 30000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if cache has valid unexpired key
   */
  public static has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete specific key
   */
  public static delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix/namespace
   */
  public static deletePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Cache-Aside Helper (Synchronous)
   */
  public static getOrSet<T>(key: string, fetchFn: () => T, ttlMs: number = 30000): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const freshValue = fetchFn();
    this.set(key, freshValue, ttlMs);
    return freshValue;
  }

  /**
   * Cache-Aside Helper (Asynchronous)
   */
  public static async getOrSetAsync<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = 30000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const freshValue = await fetchFn();
    this.set(key, freshValue, ttlMs);
    return freshValue;
  }

  /**
   * Clear all entries and reset stats
   */
  public static clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Performance Telemetry & Stats
   */
  public static getStats(): {
    size: number;
    hits: number;
    misses: number;
    total: number;
    hitRatePercentage: number;
  } {
    const total = this.hits + this.misses;
    const hitRatePercentage = total > 0 ? Number(((this.hits / total) * 100).toFixed(2)) : 0;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      total,
      hitRatePercentage,
    };
  }
}

// Global Cache Keys & TTLs
export const CACHE_CONFIG = {
  TTL: {
    SHORT: 5000, // 5s for fast-changing data (Queue)
    MEDIUM: 30000, // 30s for encounters / records
    LONG: 300000, // 5 mins for static reference data (KFA, Patients)
  },
  KEYS: {
    PATIENT: (id: string) => `patient:${id}`,
    PATIENT_NIK: (nik: string) => `patient:nik:${nik}`,
    PATIENT_MRN: (mrn: string) => `patient:mrn:${mrn}`,
    PATIENTS_ALL: "patient:list:all",
    QUEUE_PREFIX: "queue:",
    QUEUE_FILTER: (hash: string) => `queue:filter:${hash}`,
    ENCOUNTER_PREFIX: "encounter:",
    ENCOUNTER_ALL: "encounter:list:all",
    ENCOUNTER_PATIENT: (patientId: string) => `encounter:patient:${patientId}`,
    ENCOUNTER_SINGLE: (id: string) => `encounter:${id}`,
    KFA_SEARCH: (q: string) => `kfa:search:${q}`,
  },
};

/**
 * Domain Invalidation Handlers
 */
export const InvalidationService = {
  invalidatePatient(patientId?: string, nik?: string, mrn?: string) {
    if (patientId) MemoryCache.delete(CACHE_CONFIG.KEYS.PATIENT(patientId));
    if (nik) MemoryCache.delete(CACHE_CONFIG.KEYS.PATIENT_NIK(nik));
    if (mrn) MemoryCache.delete(CACHE_CONFIG.KEYS.PATIENT_MRN(mrn));
    MemoryCache.delete(CACHE_CONFIG.KEYS.PATIENTS_ALL);
    MemoryCache.deletePrefix(CACHE_CONFIG.KEYS.QUEUE_PREFIX);
    MemoryCache.deletePrefix(CACHE_CONFIG.KEYS.ENCOUNTER_PREFIX);
  },

  invalidateQueue() {
    MemoryCache.deletePrefix(CACHE_CONFIG.KEYS.QUEUE_PREFIX);
  },

  invalidateEncounter(encounterId?: string, patientId?: string) {
    if (encounterId) MemoryCache.delete(CACHE_CONFIG.KEYS.ENCOUNTER_SINGLE(encounterId));
    if (patientId) MemoryCache.delete(CACHE_CONFIG.KEYS.ENCOUNTER_PATIENT(patientId));
    MemoryCache.delete(CACHE_CONFIG.KEYS.ENCOUNTER_ALL);
    MemoryCache.deletePrefix(CACHE_CONFIG.KEYS.QUEUE_PREFIX);
  },
};
