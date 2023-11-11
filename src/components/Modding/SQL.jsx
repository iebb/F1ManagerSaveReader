import {Button, FormControl, Divider, MenuItem, Select, TextField, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useEffect, useState} from "react";

export default function DataBrowser({ database, basicInfo, metadata }) {

  const [tables, setTables] = useState([]);
  const [currentTable, setCurrentTable] = useState("Staff_BasicData");

  const [columns, setColumns] = useState([]);
  const [maxSizes, setMaxSizes] = useState([]);
  const [values, setValues] = useState([]);
  const [stmt, setStmt] = useState("SELECT * from Staff_BasicData");

  const exec = stmt => {
    try {
      let r = database.exec(stmt);
      let [{ columns, values }] = r;
      let maxSizes = columns.map(x => 0);
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
    } catch {

    }
  }


  useEffect(() => {
    try {
      let [{ values }] = database.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC");
      setTables(values.map(x => x[0]));
    } catch {

    }

  }, [database])




  return (
    <div>
      <Typography variant="h5" component="h5">
        Data Browser
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <div>
        <Typography sx={{ color: "#777", display: "inline-block", verticalAlign: "middle", mr: 3 }}>Browse Table: </Typography>
        <FormControl variant="standard" sx={{ display: "inline-block", verticalAlign: "middle" }}>
          <Select
            component="label"
            label="Table"
            value={currentTable}
            onChange={(e) => {
              const sql = `SELECT * FROM ${e.target.value}`
              setCurrentTable(e.target.value);
              setStmt(sql); exec(sql);
            }}
          >
            {
              tables.map(t => <MenuItem value={t} key={t}>{t}</MenuItem>)
            }
          </Select>
        </FormControl>
      </div>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <TextField
        label="SQL Statement"
        value={stmt}
        variant="standard"
        fullWidth
        onChange={
          (e) => setStmt(e.target.value)
        }
      />
      <Button color="warning" variant="contained" sx={{ my: 1 }} onClick={() => exec(stmt)}>
        Execute
      </Button>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <DataGrid
        rows={values.map((x, _idx) => ({id: _idx, ...x}))}
        columns={columns.map((x, _idx) => ({
          field: x,
          flex: maxSizes[_idx],
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