export function memoizeAsync(load, keyOf) {
  const entries = new Map();

  return (...args) => {
    const key = keyOf(...args);

    if (!entries.has(key)) {
      const pending = Promise.resolve()
        .then(() => load(...args))
        .catch((error) => {
          entries.delete(key);
          throw error;
        });

      entries.set(key, pending);
    }

    return entries.get(key);
  };
}
