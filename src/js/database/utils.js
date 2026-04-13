export function readRows(database, query, params = {}) {
  if (!database?.getAllRows) {
    return [];
  }

  try {
    return database.getAllRows(query, params);
  } catch {
    return [];
  }
}

export function readFirstRow(database, query, params = {}) {
  return readRows(database, query, params)[0] || null;
}

export function runInTransaction(database, callback) {
  if (!database?.exec || typeof callback !== "function") {
    return callback?.();
  }

  database.exec("BEGIN");
  try {
    const result = callback();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // Ignore rollback failures when the transaction is already closed.
    }
    throw error;
  }
}
