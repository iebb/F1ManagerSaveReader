export const DBWrapper = (db) => {
  if (db) {
    db.getAllRows = (...params) => {
      let rows = [];
      const result = db.exec(...params);
      if (result.length) {
        let [{ values, columns }] = result;
        for (const r of values) {
          let row = {};
          r.map((x, _idx) => { row[columns[_idx]] = x })
          rows.push(row);
        }
      }
      return rows;
    }
  }
  return db;
}