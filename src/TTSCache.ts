/* eslint-disable @typescript-eslint/no-non-null-assertion */
type Entry<K, V> = {
  newer: Entry<K, V> | undefined;
  older: Entry<K, V> | undefined;
  key: K;
  value: V;
};

export type CacheEntry<K, V> = {
  key: K;
  value: V;
};

type KeyValue<K, V> = { key: K; value: V };

export default class TTSCache<K, V> {
  #size: number;

  #capacity: number;

  #map: Map<K, Entry<K, V>>;

  // most recently used
  #mru: Entry<K, V> | undefined;

  // least recently used
  #lru: Entry<K, V> | undefined;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('Capacity must be greater than 0');

    this.#size = 0;
    this.#capacity = capacity;
    this.#map = new Map();
  }

  public get size(): number {
    return this.#size;
  }

  public get capacity(): number {
    return this.#capacity;
  }

  public get mru(): CacheEntry<K, V> | undefined {
    if (this.#mru) return { key: this.#mru.key, value: this.#mru.value };
    return undefined;
  }

  public get lru(): CacheEntry<K, V> | undefined {
    if (this.#lru) return { key: this.#lru.key, value: this.#lru.value };
    return undefined;
  }

  public get(key: K): V | undefined {
    if (this.size === 0) return;

    const entry = this.#map.get(key);
    if (!entry) return;

    this.used(entry);
    // eslint-disable-next-line consistent-return
    return entry.value;
  }

  private used(entry: Entry<K, V>) {
    if (this.#mru === entry) {
      // already mru/newest
      return;
    }

    // mark as mru/"newest"
    // we checked that size > 0 so mru must not be undefined
    const prevMru = this.#mru!;
    prevMru.newer = entry;
    this.#mru = entry;
    // since this item was not the mru, we are guaranteed to have a newer entry
    entry.newer!.older = entry.older;

    if (!entry.older) {
      // was lru
      this.#lru = entry.newer!;
    } else {
      entry.older!.newer = entry.newer;
    }

    entry.newer = undefined;
    entry.older = prevMru;
  }

  public put(key: K, value: V) {
    if (this.size === 0) {
      const entry: Entry<K, V> = {
        newer: undefined,
        older: undefined,
        key,
        value,
      };
      this.#map.set(key, entry);
      this.#mru = entry;
      this.#lru = entry;
      this.#size = 1;

      return;
    }

    const existing = this.#map.get(key);

    if (existing) {
      // update value
      existing.value = value;
      // TODO keep this when just updating the value?
      this.used(existing);
      return;
    }

    const entry: Entry<K, V> = {
      newer: undefined,
      older: undefined,
      key,
      value,
    };
    this.#map.set(key, entry);
    this.#size += 1;

    if (!this.#mru) {
      // first entry
      this.#mru = entry;
      this.#lru = entry;
    } else {
      // set new mru
      const prevMru = this.#mru;
      this.#mru = entry;
      entry.older = prevMru;
      prevMru.newer = entry;
    }

    if (this.#size > this.capacity) {
      // cache full -> delete lru
      const prevLru = this.#lru!;
      this.#lru = prevLru.newer;
      prevLru.older = undefined;

      // remove refs
      prevLru.newer = undefined;
      prevLru.older = undefined;
      this.#map.delete(prevLru.key);

      this.#size -= 1;
    }
  }

  public clear() {
    this.#lru = undefined;
    this.#mru = undefined;
    this.#size = 0;
    this.#map.clear();
  }

  public toJSON() {
    const arr = new Array(this.size);
    // start with lru/oldest so we can use put to fill the cache when reading it back in
    let entry = this.#lru;
    let i = 0;
    while (entry) {
      arr[i] = { key: entry.key, value: entry.value };
      i += 1;
      entry = entry.newer;
    }

    if (i !== arr.length)
      throw new Error('Length mismatch during serialization');

    return JSON.stringify({ capacity: this.#capacity, entries: arr });
  }

  public static fromJSON<K, V>(json: string): TTSCache<K, V> | undefined {
    const from: { capacity: number; entries: KeyValue<K, V>[] } =
      JSON.parse(json);
    if (from && from.entries) {
      return TTSCache.fromKeyValueArray<K, V>(from.entries, from.capacity);
    }

    // eslint-disable-next-line no-useless-return, consistent-return
    return;
  }

  public static fromKeyValueArray<K, V>(
    from: KeyValue<K, V>[],
    capacity: number
  ): TTSCache<K, V> {
    if (capacity < from.length)
      throw new Error('Capacity too small to fit all serialized entries');

    const result = new TTSCache<K, V>(capacity);
    for (const kv of from) {
      result.put(kv.key, kv.value);
    }

    return result;
  }
}
