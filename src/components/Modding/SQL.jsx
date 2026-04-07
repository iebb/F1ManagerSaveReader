import { DatabaseContext } from "@/js/Contexts";
import { DataGrid } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];
const DEFAULT_PAGE_SIZE = 50;

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseEditedValue(value, oldValue) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  if (typeof oldValue === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : oldValue;
  }
  return String(value);
}

export default function DataBrowser() {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();

  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectFilter, setObjectFilter] = useState("");
  const [mode, setMode] = useState("browse");
  const [tableSearch, setTableSearch] = useState("");
  const [querySql, setQuerySql] = useState("");

  const [browseColumns, setBrowseColumns] = useState([]);
  const [browseRows, setBrowseRows] = useState([]);
  const [browseMeta, setBrowseMeta] = useState({ totalRows: 0, sql: "", tableInfo: [] });
  const [queryColumns, setQueryColumns] = useState([]);
  const [queryRows, setQueryRows] = useState([]);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [refreshToken, setRefreshToken] = useState(0);

  const selectedName = selectedObject?.name || "";
  const isTable = selectedObject?.type === "table";

  const filteredObjects = useMemo(() => {
    const needle = objectFilter.trim().toLowerCase();
    if (!needle) return objects;
    return objects.filter((entry) => entry.name.toLowerCase().includes(needle));
  }, [objectFilter, objects]);

  const schemaText = useMemo(() => {
    if (!selectedObject) return "";
    const infoLines = (browseMeta.tableInfo || []).map((col) => {
      const pk = col.pk ? " pk" : "";
      const nn = col.notnull ? " not null" : "";
      const dv = col.dflt_value !== null && col.dflt_value !== undefined ? ` default ${col.dflt_value}` : "";
      return `${col.name}  ${col.type || "TEXT"}${pk}${nn}${dv}`;
    });
    return [browseMeta.sql || "", ...(infoLines.length ? ["", ...infoLines] : [])].join("\n").trim();
  }, [browseMeta.sql, browseMeta.tableInfo, selectedObject]);

  const loadObjects = React.useCallback(() => {
    try {
      const result = database.exec(`
        SELECT name, type, sql
        FROM sqlite_master
        WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
        ORDER BY
          CASE type WHEN 'table' THEN 0 ELSE 1 END,
          name ASC
      `);
      const nextObjects = result.length
        ? result[0].values.map(([name, type, sql]) => ({ name, type, sql: sql || "" }))
        : [];
      setObjects(nextObjects);
      setSelectedObject((current) => {
        if (current && nextObjects.some((entry) => entry.name === current.name && entry.type === current.type)) {
          return current;
        }
        return nextObjects[0] || null;
      });
    } catch (error) {
      enqueueSnackbar(`Error loading database objects: ${error}`, { variant: "error" });
    }
  }, [database, enqueueSnackbar]);

  const loadBrowseData = React.useCallback(() => {
    if (!selectedObject) return;
    try {
      const quotedName = quoteIdent(selectedObject.name);
      const pragmaResult = database.exec(`PRAGMA table_info(${quotedName})`);
      const tableInfo = pragmaResult.length
        ? pragmaResult[0].values.map(([cid, name, type, notnull, dflt_value, pk]) => ({
          cid,
          name,
          type,
          notnull,
          dflt_value,
          pk,
        }))
        : [];

      const countResult = database.exec(`SELECT COUNT(*) FROM ${quotedName}`);
      const totalRows = countResult.length ? Number(countResult[0].values[0][0]) : 0;

      const limit = paginationModel.pageSize;
      const offset = paginationModel.page * paginationModel.pageSize;
      const whereClause = tableSearch.trim()
        ? `WHERE ${tableInfo.length
          ? tableInfo
            .map((col) => `CAST(${quoteIdent(col.name)} AS TEXT) LIKE :search`)
            .join(" OR ")
          : `CAST(${quoteIdent("rowid")} AS TEXT) LIKE :search`}`
        : "";
      const params = tableSearch.trim() ? { ":search": `%${tableSearch.trim()}%` } : {};

      const sql = `SELECT *, _rowid_ AS __rowid__ FROM ${quotedName} ${whereClause} LIMIT ${limit} OFFSET ${offset}`;
      const result = database.exec(sql, params);
      const columns = result.length ? result[0].columns : [];
      const values = result.length ? result[0].values : [];
      const rows = values.map((row, index) => {
        const nextRow = { id: `${selectedObject.name}-${offset + index}` };
        columns.forEach((col, idx) => {
          nextRow[col] = row[idx];
        });
        if (nextRow.__rowid__ !== undefined) {
          nextRow.id = nextRow.__rowid__;
        }
        return nextRow;
      });

      const countSql = tableSearch.trim()
        ? `SELECT COUNT(*) FROM ${quotedName} ${whereClause}`
        : `SELECT COUNT(*) FROM ${quotedName}`;
      const filteredCountResult = database.exec(countSql, params);
      const filteredTotalRows = filteredCountResult.length ? Number(filteredCountResult[0].values[0][0]) : totalRows;

      setBrowseMeta({
        totalRows: filteredTotalRows,
        sql: selectedObject.sql || "",
        tableInfo,
      });
      setBrowseColumns(columns);
      setBrowseRows(rows);
      if (!querySql.trim() || querySql.startsWith("SELECT *, _rowid_ AS __rowid__ FROM")) {
        setQuerySql(`SELECT *, _rowid_ AS __rowid__ FROM ${selectedObject.name}`);
      }
    } catch (error) {
      enqueueSnackbar(`Error loading ${selectedObject.name}: ${error}`, { variant: "error" });
      setBrowseColumns([]);
      setBrowseRows([]);
      setBrowseMeta({ totalRows: 0, sql: selectedObject.sql || "", tableInfo: [] });
    }
  }, [database, enqueueSnackbar, paginationModel.page, paginationModel.pageSize, querySql, selectedObject, tableSearch]);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  useEffect(() => {
    if (!selectedObject) return;
    loadBrowseData();
  }, [loadBrowseData, refreshToken, selectedObject]);

  useEffect(() => {
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, [selectedName, tableSearch]);

  const pkColumns = useMemo(
    () => browseMeta.tableInfo.filter((col) => col.pk).sort((a, b) => a.pk - b.pk),
    [browseMeta.tableInfo]
  );

  const browseGridColumns = useMemo(() => {
    if (!browseColumns.length) return [];
    const metaByName = Object.fromEntries(browseMeta.tableInfo.map((col) => [col.name, col]));
    return [
      ...browseColumns.map((col) => {
        if (col === "__rowid__") {
          return {
            field: col,
            headerName: "#",
            width: 86,
            editable: false,
            sortable: false,
          };
        }
        return {
          field: col,
          headerName: col,
          minWidth: 120,
          flex: 1,
          editable: isTable,
          sortable: false,
          renderCell: ({ value }) => (
            <div className="min-w-0 truncate text-sm text-slate-200">{formatCellValue(value)}</div>
          ),
          headerClassName: metaByName[col]?.pk ? "db-pk-col" : "",
        };
      }),
      ...(isTable ? [{
        field: "__actions__",
        headerName: "",
        width: 90,
        sortable: false,
        filterable: false,
        editable: false,
        renderCell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              try {
                const quotedName = quoteIdent(selectedName);
                if (pkColumns.length) {
                  const where = pkColumns.map((col) => `${quoteIdent(col.name)} = :${col.name}`).join(" AND ");
                  const params = Object.fromEntries(pkColumns.map((col) => [`:${col.name}`, row[col.name] ?? null]));
                  database.exec(`DELETE FROM ${quotedName} WHERE ${where}`, params);
                } else {
                  database.exec(`DELETE FROM ${quotedName} WHERE _rowid_ = :rowid`, { ":rowid": row.__rowid__ });
                }
                enqueueSnackbar(`Deleted row from ${selectedName}`, { variant: "success" });
                setRefreshToken(Date.now());
              } catch (error) {
                enqueueSnackbar(`Delete failed: ${error}`, { variant: "error" });
              }
            }}
            className="border border-red-400/20 bg-red-500/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-100 hover:bg-red-500/[0.1]"
          >
            Delete
          </button>
        ),
      }] : []),
    ];
  }, [browseColumns, browseMeta.tableInfo, database, enqueueSnackbar, isTable, pkColumns, selectedName]);

  const queryGridColumns = useMemo(() => (
    queryColumns.map((col) => ({
      field: col,
      headerName: col,
      minWidth: 140,
      flex: 1,
      sortable: false,
      renderCell: ({ value }) => (
        <div className="min-w-0 truncate text-sm text-slate-200">{formatCellValue(value)}</div>
      ),
    }))
  ), [queryColumns]);

  const runQuery = React.useCallback(() => {
    try {
      const result = database.exec(querySql);
      if (!result.length) {
        setQueryColumns([]);
        setQueryRows([]);
        enqueueSnackbar("Statement executed successfully", { variant: "success" });
        setRefreshToken(Date.now());
        loadObjects();
        return;
      }
      const [{ columns, values }] = result;
      setQueryColumns(columns);
      setQueryRows(values.map((row, index) => {
        const nextRow = { id: index };
        columns.forEach((col, idx) => {
          nextRow[col] = row[idx];
        });
        return nextRow;
      }));
      enqueueSnackbar(`Loaded ${values.length} row${values.length === 1 ? "" : "s"}`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(`SQL error: ${error}`, { variant: "error" });
    }
  }, [database, enqueueSnackbar, loadObjects, querySql]);

  const insertRow = React.useCallback(() => {
    if (!selectedObject || !isTable) return;
    try {
      database.exec(`INSERT INTO ${quoteIdent(selectedName)} DEFAULT VALUES`);
      enqueueSnackbar(`Inserted row into ${selectedName}`, { variant: "success" });
      setRefreshToken(Date.now());
    } catch (error) {
      enqueueSnackbar(`Insert failed: ${error}`, { variant: "error" });
    }
  }, [database, enqueueSnackbar, isTable, selectedName, selectedObject]);

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Modding</div>
            <h2 className="mt-2 text-lg font-bold text-white">Database Browser</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              Browse tables and views like a SQLite browser, inspect schema, run ad-hoc SQL, and edit rows directly.
            </p>
          </div>
          <div className="border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-400">
            SQLite-style workspace
          </div>
        </div>
      </section>

      <section className="grid min-h-[720px] gap-0 border border-white/10 bg-white/[0.015] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-white/10 bg-black/10">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Objects</div>
            <input
              type="text"
              value={objectFilter}
              onChange={(e) => setObjectFilter(e.target.value)}
              placeholder="Filter tables and views"
              className="mt-3 w-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {filteredObjects.map((entry) => {
              const selected = selectedName === entry.name && selectedObject?.type === entry.type;
              return (
                <button
                  key={`${entry.type}-${entry.name}`}
                  type="button"
                  onClick={() => setSelectedObject(entry)}
                  className={`flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left transition ${
                    selected
                      ? "bg-sky-500/10 text-white"
                      : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{entry.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">{entry.type}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)]">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  {selectedObject ? selectedObject.type : "Object"}
                </div>
                <div className="mt-1 truncate text-lg font-bold text-white">{selectedName || "No object selected"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "browse", label: "Browse Data" },
                  { id: "query", label: "SQL Query" },
                  { id: "schema", label: "Schema" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                      mode === tab.id
                        ? "border-sky-300/40 bg-sky-500/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mode === "browse" ? (
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter rows in current object"
                    className="min-w-[260px] flex-1 border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setRefreshToken(Date.now())}
                    className="border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-200 hover:bg-white/[0.06]"
                  >
                    Reload
                  </button>
                  {isTable ? (
                    <button
                      type="button"
                      onClick={insertRow}
                      className="border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-100 hover:bg-emerald-500/[0.1]"
                    >
                      Insert Row
                    </button>
                  ) : null}
                </div>
                <div className="text-xs text-slate-400">
                  {browseMeta.totalRows.toLocaleString()} row{browseMeta.totalRows === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          ) : mode === "query" ? (
            <div className="border-b border-white/10 px-4 py-3">
              <div className="grid gap-3">
                <textarea
                  value={querySql}
                  onChange={(e) => setQuerySql(e.target.value)}
                  spellCheck={false}
                  className="min-h-[120px] w-full resize-y border border-white/10 bg-[#0d1117] px-3 py-3 font-mono text-sm text-slate-200 outline-none placeholder:text-slate-500"
                  placeholder="SELECT * FROM Player"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runQuery}
                    className="border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-100 hover:bg-amber-500/[0.1]"
                  >
                    Execute
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuerySql(selectedName ? `SELECT *, _rowid_ AS __rowid__ FROM ${selectedName}` : "")}
                    className="border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-200 hover:bg-white/[0.06]"
                  >
                    Reset To Selected Object
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="min-w-0 overflow-hidden">
            {mode === "schema" ? (
              <div className="h-full overflow-auto bg-[#0d1117] p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-slate-200">
                  {schemaText || "-- No schema available"}
                </pre>
              </div>
            ) : mode === "query" ? (
              <div className="h-full min-w-0 overflow-x-auto">
                <DataGrid
                  key={`query-${querySql}`}
                  rows={queryRows}
                  columns={queryGridColumns}
                  rowHeight={42}
                  columnHeaderHeight={42}
                  disableRowSelectionOnClick
                  initialState={{
                    pagination: { paginationModel: { pageSize: DEFAULT_PAGE_SIZE } },
                  }}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            ) : (
              <div className="h-full min-w-0 overflow-x-auto">
                <DataGrid
                  key={`browse-${selectedName}-${paginationModel.page}-${paginationModel.pageSize}-${refreshToken}`}
                  rows={browseRows}
                  columns={browseGridColumns}
                  rowHeight={42}
                  columnHeaderHeight={42}
                  disableRowSelectionOnClick
                  rowCount={browseMeta.totalRows}
                  paginationMode="server"
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  processRowUpdate={(newRow, oldRow) => {
                    if (!isTable) return oldRow;
                    try {
                      const changedField = browseColumns.find((col) => col !== "__rowid__" && newRow[col] !== oldRow[col]);
                      if (!changedField) return oldRow;
                      const nextValue = parseEditedValue(newRow[changedField], oldRow[changedField]);
                      const quotedName = quoteIdent(selectedName);
                      if (pkColumns.length) {
                        const where = pkColumns.map((col) => `${quoteIdent(col.name)} = :pk_${col.name}`).join(" AND ");
                        const params = {
                          ":value": nextValue,
                          ...Object.fromEntries(pkColumns.map((col) => [`:pk_${col.name}`, oldRow[col.name] ?? null])),
                        };
                        database.exec(`UPDATE ${quotedName} SET ${quoteIdent(changedField)} = :value WHERE ${where}`, params);
                      } else {
                        database.exec(
                          `UPDATE ${quotedName} SET ${quoteIdent(changedField)} = :value WHERE _rowid_ = :rowid`,
                          { ":value": nextValue, ":rowid": oldRow.__rowid__ }
                        );
                      }
                      enqueueSnackbar(`Updated ${selectedName}.${changedField}`, { variant: "success" });
                      setRefreshToken(Date.now());
                      return { ...newRow, [changedField]: nextValue };
                    } catch (error) {
                      enqueueSnackbar(`Update failed: ${error}`, { variant: "error" });
                      return oldRow;
                    }
                  }}
                  onProcessRowUpdateError={(error) => enqueueSnackbar(`Update failed: ${error}`, { variant: "error" })}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
