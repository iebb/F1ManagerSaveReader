import {Autocomplete, Button, Divider, FormControl, Grid, MenuItem, Select, TextField, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";

export default function DataBrowser() {

  const database = useContext(DatabaseContext);

  const { enqueueSnackbar } = useSnackbar();

  const [tables, setTables] = useState([]);
  const [currentTable, setCurrentTable] = useState("Player");
  const [isSimple, setIsSimple] = useState(true);

  const [columns, setColumns] = useState([]);
  const [maxSizes, setMaxSizes] = useState([]);
  const [values, setValues] = useState([]);
  const [stmt, setStmt] = useState("SELECT * from Player");

  const exec = stmt => {
    try {
      let r = database.exec(stmt);
      if (r.length) {
        let [{ columns, values }] = r;
        let maxSizes = columns.map(x => Math.min(x.length, 10));
        setColumns(columns);
        setValues(values.map(val => {
          let row = {};
          val.map((x, _idx) => {
            if (x !== null) {
              row[columns[_idx]] = x;
              if (x.length > maxSizes[_idx]) maxSizes[_idx] = x.length;
            }
          })
          return row;
        }));
        setMaxSizes(maxSizes);
      }
      enqueueSnackbar(
        `Executed successfully`,
        { variant: "success" }
      );
    } catch (e) {
      enqueueSnackbar(
        `Error: ${e}`,
        { variant: "error" }
      );
    }
  }


  useEffect(() => {
    try {
      let [{ values }] = database.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC");
      setTables(values.map(x => x[0]));
      setCurrentTable(currentTable);
      setStmt(`SELECT * FROM ${currentTable}`);
      exec(`SELECT *, _rowid_ as _rowid_ FROM ${currentTable}`);
    } catch {

    }

  }, [database])




  return (
    <div>
      <Typography variant="h5" component="h5">
        SQLite Browser / Editor
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Grid container spacing={2} alignItems="center">
        <Grid item flex={1}>
          <TextField
            label="Execute SQL Statement Here"
            value={stmt}
            variant="standard"
            fullWidth
            onChange={
              (e) => setStmt(e.target.value)
            }
          />
        </Grid>
        <Grid item>
          <Button color="warning" variant="contained" sx={{ my: 1 }} onClick={() => {
            exec(stmt);
            setIsSimple(false);
          }}>
            Execute
          </Button>
        </Grid>
      </Grid>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Grid container spacing={2} alignItems="center">
        <Grid item flex={1}>
          <FormControl variant="standard" sx={{ display: "inline-block", verticalAlign: "middle", width: "100%" }}>
            <Autocomplete
              disablePortal
              options={tables}
              value={currentTable}
              sx={{ width: "100%" }}
              onChange={(e, nv) => {
                if (nv) {
                  setCurrentTable(nv);
                  setStmt(`SELECT * FROM ${nv}`);
                  exec(`SELECT _rowid_ as _rowid_, * FROM ${nv}`);
                  setIsSimple(true);
                }
              }}
              renderInput={(params) => <TextField
                variant="standard"
                {...params}
                label="Browse a Table"
                autoComplete="off"
              />}
            />
          </FormControl>
        </Grid>
      </Grid>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <DataGrid
        key={stmt}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          if (isSimple) {
            for(const key of columns) {
              if (key === "id" || key === "_rowid_") continue;
              if (newRow[key] !== oldRow[key]) {
                database.exec(`UPDATE ${currentTable} SET ${key} = :value WHERE _rowid_ = :rowid`, {
                  ":value": newRow[key],
                  ":rowid": newRow._rowid_,
                })
                exec(`SELECT _rowid_ as _rowid_, * FROM ${currentTable}`);
              }
            }
            // refresh();
            return newRow;
          }
          return oldRow;
        }}
        rows={values.map((x, _idx) => (
          {id: x.row ? x.row : _idx, ...x}
        ))}
        columns={columns.map((x, _idx) => ({
          field: x,
          headerName: x === "_rowid_" ? "#" : x,
          flex: maxSizes[_idx],
          editable: isSimple && (x !== "_rowid_"),
        }))}
        density="compact"
        initialState={{
          pagination: { paginationModel: { pageSize: 20 } },
        }}
        pageSizeOptions={[20, 50, 100]}
      />
    </div>
  );
}