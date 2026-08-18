/**
 * Stand-ins for the two Supabase surfaces the data layer touches — a mock of
 * the shape our code depends on, not of Supabase. Deliberately not named
 * `test-*.js`: Node's runner would try to execute it.
 */

/**
 * A PostgREST query builder that answers `result` however it is chained. Every
 * method returns the same thenable object, so the stub never needs to know
 * which call came last.
 */
export function stubQuery(result) {
  const chain = {
    // What the call site asked for, so tests can assert on the query and not
    // only the answer — the column map, the redundant `user_id` filter and the
    // absence of `user_id` from COLUMNS are all checked through these.
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
