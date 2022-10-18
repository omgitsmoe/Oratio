import TTSCache from './TTSCache';

test('put + get', () => {
  const cache = new TTSCache<string, number>(2);
  expect(cache.capacity).toBe(2);

  cache.put('foo', 123);
  expect(cache.size).toBe(1);
  expect(cache.mru).toEqual({ key: 'foo', value: 123 });
  expect(cache.lru).toEqual({ key: 'foo', value: 123 });
  expect(cache.get('foo')).toBe(123);

  cache.put('bar', 456);
  expect(cache.size).toBe(2);
  expect(cache.mru).toEqual({ key: 'bar', value: 456 });
  expect(cache.lru).toEqual({ key: 'foo', value: 123 });
  expect(cache.get('foo')).toBe(123);
  expect(cache.lru).toEqual({ key: 'bar', value: 456 });
  expect(cache.mru).toEqual({ key: 'foo', value: 123 });
  expect(cache.get('bar')).toBe(456);
});

test('cache evicts lru', () => {
  const cache = new TTSCache<string, number>(2);
  cache.put('foo', 123);
  cache.put('bar', 456);

  // should evict foo
  cache.put('baz', 789);
  expect(cache.capacity).toBe(2);
  expect(cache.size).toBe(2);
  expect(cache.lru).toEqual({ key: 'bar', value: 456 });
  expect(cache.mru).toEqual({ key: 'baz', value: 789 });

  expect(cache.get('foo')).toBe(undefined);
  expect(cache.get('bar')).toBe(456);
  expect(cache.get('baz')).toBe(789);
});

test('cache evicts lru - 1 item special case', () => {
  const cache = new TTSCache<string, number>(1);
  cache.put('foo', 123);

  // should evict foo
  cache.put('bar', 456);
  expect(cache.capacity).toBe(1);
  expect(cache.size).toBe(1);
  expect(cache.lru).toEqual({ key: 'bar', value: 456 });
  expect(cache.mru).toEqual({ key: 'bar', value: 456 });

  expect(cache.get('foo')).toBe(undefined);
  expect(cache.get('bar')).toBe(456);
});

test('cache evicts lru with get', () => {
  const cache = new TTSCache<string, number>(2);
  cache.put('foo', 123);
  cache.put('bar', 456);
  expect(cache.get('foo')).toBe(123);

  // should evict bar
  cache.put('baz', 789);
  expect(cache.capacity).toBe(2);
  expect(cache.size).toBe(2);

  expect(cache.get('foo')).toBe(123);
  expect(cache.get('bar')).toBe(undefined);
  expect(cache.get('baz')).toBe(789);
});

test('cache evicts lru with update', () => {
  // TODO keep this?
  const cache = new TTSCache<string, number>(2);
  cache.put('foo', 123);
  cache.put('bar', 456);

  // should not evict, but update foo
  cache.put('foo', 789);
  expect(cache.capacity).toBe(2);
  expect(cache.size).toBe(2);

  // should evict bar, since foo should be mru
  cache.put('baz', 123);
  expect(cache.capacity).toBe(2);
  expect(cache.size).toBe(2);

  expect(cache.get('foo')).toBe(789);
  expect(cache.get('bar')).toBe(undefined);
  expect(cache.get('baz')).toBe(123);
});

test('put + get 3 items', () => {
  const cache = new TTSCache<string, number>(3);
  expect(cache.capacity).toBe(3);

  cache.put('foo', 123);
  cache.put('bar', 456);
  cache.put('baz', 789);
  expect(cache.size).toBe(3);
  expect(cache.mru).toEqual({ key: 'baz', value: 789 });
  expect(cache.lru).toEqual({ key: 'foo', value: 123 });

  expect(cache.get('foo')).toBe(123);
  expect(cache.lru).toEqual({ key: 'bar', value: 456 });
  expect(cache.mru).toEqual({ key: 'foo', value: 123 });
  expect(cache.get('bar')).toBe(456);
  expect(cache.lru).toEqual({ key: 'baz', value: 789 });
  expect(cache.mru).toEqual({ key: 'bar', value: 456 });
});

test('cache evicts lru with get 3 cap', () => {
  const cache = new TTSCache<string, number>(3);
  cache.put('foo', 123);
  cache.put('bar', 456);
  cache.put('baz', 789);
  expect(cache.get('foo')).toBe(123);

  // should evict bar
  cache.put('test', 1);
  expect(cache.size).toBe(3);

  expect(cache.lru).toEqual({ key: 'baz', value: 789 });
  expect(cache.mru).toEqual({ key: 'test', value: 1 });
  expect(cache.get('foo')).toBe(123);
  expect(cache.get('bar')).toBe(undefined);
  expect(cache.get('baz')).toBe(789);
  expect(cache.get('test')).toBe(1);
});
