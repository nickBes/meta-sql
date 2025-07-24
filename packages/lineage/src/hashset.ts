export class HashSet<T> implements Set<T> {
  private map: Map<string, T> = new Map();
  private hasher: (value: T) => string;

  constructor(hasher?: (value: T) => string) {
    this.hasher = hasher || ((value: T) => JSON.stringify(value));
  }
  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown
  ): void {
    this.map.forEach((value) => {
      callbackfn.call(thisArg, value, value, this);
    });
  }

  entries(): SetIterator<[T, T]> {
    return this.map.entries() as SetIterator<[T, T]>;
  }

  keys(): SetIterator<T> {
    return this.map.keys() as SetIterator<T>;
  }

  values(): SetIterator<T> {
    return this.map.values() as SetIterator<T>;
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.map.values() as SetIterator<T>;
  }

  [Symbol.toStringTag]: string = "HashSet";

  get size(): number {
    return this.map.size;
  }

  add(value: T): this {
    this.map.set(this.hasher(value), value);
    return this;
  }

  delete(value: T): boolean {
    return this.map.delete(this.hasher(value));
  }

  clear(): this {
    this.map.clear();
    return this;
  }

  has(value: T): boolean {
    return this.map.has(this.hasher(value));
  }

  intersection(other: Set<T>): HashSet<T> {
    const intersection = new HashSet<T>(this.hasher);
    for (const value of other) {
      if (this.has(value)) {
        intersection.add(value);
      }
    }
    return intersection;
  }
}
