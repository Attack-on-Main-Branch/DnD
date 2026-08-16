/**
 * Minimal stand-ins for the two Supabase surfaces the data layer touches.
 *
 * Not a mock of Supabase — a mock of the shape our own code depends on, which
 * is a much smaller thing and the only part a test has any business asserting
 * about. Deliberately not named `test-*.js`: Node's test runner treats that
 * prefix as a test file and would try to execute this.
 */

/**
 * A PostgREST query builder that answers `result` however it is chained.
 *
 * Every builder method returns the same object and the object is thenable, so
 * `.from().delete().eq().eq().select("id")` and `.from().select().eq().order()`
 * both await to `result` without the stub needing to know which call came last.
 */
export function stubQuery(result) {
  const chain = {
    // What the call site actually asked for, so a test can assert on the query
    // and not only on the answer. Without these the builder swallowed its
    // arguments, and three things went untested: the camelCase-to-snake_case
    // column map in `insertCharacter`, the redundant `.eq("user_id", …)` that
    // the data layer calls "a second lock on the same door", and the fact that
    // `COLUMNS` never selects `user_id`. Deleting any of the three left the
    // whole suite green.
    filters: [],
    lastInsert: null,
    lastSelect: null,

    from: () => chain,
    select: (columns) => {
      chain.lastSelect = columns;
      return chain;
    },
    insert: (payload) => {
      chain.lastInsert = payload;
      return chain;
    },
    delete: () => chain,
    eq: (column, value) => {
      chain.filters.push([column, value]);
      return chain;
    },
    order: () => chain,
    maybeSingle: () => chain,
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return chain;
}

/** A Supabase client whose `auth` methods answer with whatever is passed in. */
export function stubAuth(methods) {
  return { auth: methods };
}

/** The shape Supabase returns for a failure. `code` is what `classify` reads. */
export function authError(code, message = "stub failure") {
  return { data: { user: null, session: null }, error: { code, message } };
}

/** The shape PostgREST returns for a failure. */
export function postgrestError(code, message = "stub failure") {
  return { data: null, error: { code, message } };
}
