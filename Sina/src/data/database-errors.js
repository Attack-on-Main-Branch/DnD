const DATABASE_ERROR_REASONS = new Map([
  ["23514", "invalid_value"],
  ["23503", "not_found"],
  ["42P01", "missing_table"],
  ["PGRST205", "missing_table"],
  ["42703", "missing_column"],
  ["42883", "missing_function"],
  ["PGRST202", "missing_function"],
  ["22P02", "bad_id"],
]);

export function classifyDatabaseError({ code }, fallback = "unknown") {
  return DATABASE_ERROR_REASONS.get(code) ?? fallback;
}
