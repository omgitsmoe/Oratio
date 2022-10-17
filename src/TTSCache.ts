class Entry<K, V> {
    newer: Entry<K, V> | undefined
    older: Entry<K, V> | undefined
    key: K
    value: V

    constructor(key: K, value: V) {
        this.key = key;
        this.value = value;
    }
}

type KeyValue<K, V> = { key: K; value: V };

export class TTSCache<K, V> {
    #size: number

    #capacity: number

    #map: Map<K, Entry<K, V>>

    // most recently used
    #mru: Entry<K, V> | undefined

    // least recently used
    #lru: Entry<K, V> | undefined

    constructor(capacity: number) {
        if (capacity <= 0) throw 'Capacity must be greater than 0';

        this.#size = 0;
        this.#capacity = capacity;
        this.#map = new Map();
    }

    get size(): number {
        return this.#size;
    }

    get capacity(): number {
        return this.#capacity;
    }

    public get(key: K): V | undefined {
        console.log('get start');
        if (this.size === 0) return;

        let entry = this.#map.get(key);
        console.log(this.#map);
        if (!entry) return;
        console.log('entry found');

        this.used(entry);
        return entry.value;
    } 

    private used(entry: Entry<K, V>) {
        if (this.#mru == entry) {
            // already mru/newest
            return;
        }

        // mark as mru/"newest"
        // we checked that size > 0 so mru must not be undefined
        const prev_mru = this.#mru!;
        prev_mru.newer = entry;
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
        entry.older = prev_mru;
    }

    public put(key: K, value: V) {
        if (this.size === 0) {
            const entry = new Entry(key, value);
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

        const entry = new Entry(key, value);
        this.#map.set(key, entry);
        this.#size++;

        if (!this.#mru) {
            // first entry
            this.#mru = entry;
            this.#lru = entry;
        } else {
            // set new mru
            const prev_mru = this.#mru;
            this.#mru = entry;
            entry.older = prev_mru;
            prev_mru.newer = entry;
        }

        if (this.#size > this.capacity) {
            // cache full -> delete lru
            const prev_lru = this.#lru!;
            console.log('full -> deleting lru', prev_lru.key);
            this.#lru = prev_lru.newer;
            prev_lru.older = undefined;

            // remove refs
            prev_lru.newer = prev_lru.older = undefined;
            this.#map.delete(prev_lru.key);

            this.#size--;
        }
    }

    public clear() {
        this.#lru = this.#mru = undefined;
        this.#size = 0;
        this.#map.clear();
    }

    public toJSON() {
        const arr = new Array(this.size);
        // start with lru/oldest so we can use put to fill the cache when reading it back in
        let entry = this.#lru;
        let i = 0;
        while (entry) {
            arr[i++] = { key: entry.key, value: entry.value };
            entry = entry.newer;
        }

        if (i !== arr.length) throw 'Length mismatch during serialization';

        return JSON.stringify({capacity: this.#capacity, entries: arr});
    }

    public static fromJSON<K, V>(json: string): TTSCache<K, V> | undefined {
        const from: {capacity: number; entries: KeyValue<K, V>[]} = JSON.parse(json);
        if (from && from.entries) {
            return TTSCache.fromKeyValueArray<K, V>(from.entries, from.capacity);
        }

        return;
    }

    public static fromKeyValueArray<K, V>(from: KeyValue<K, V>[], capacity: number): TTSCache<K, V> {
        if (capacity < from.length) throw 'Capacity too small to fit all serialized entries';

        const result = new TTSCache<K, V>(capacity);
        for (const kv of from) {
            result.put(kv.key, kv.value);
        }

        return result;
    }
}