import { DatabaseContext } from "@/js/Contexts";
import { inspectionStateLabels } from "@/components/Modding/saveOperationsShared";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext } from "react";

export default function SportingWorkspace({ inspectionRows, penaltyCount, onRefresh }) {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();
  const failedInspections = inspectionRows.filter((row) => row.Result === 2 || row.Result === 3).length;

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sporting Audit</div>
            <h2 className="mt-2 text-lg font-bold text-white">Penalties & Inspection Results</h2>
            <p className="mt-2 max-w-[880px] text-sm text-slate-400">
              Inspect extra race data that already lives in the save and adjust the cleanly editable parts without dropping into raw SQL.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:min-w-[420px]">
            {[
              { label: "Inspections", value: inspectionRows.length },
              { label: "Failed Inspections", value: failedInspections },
              { label: "Grid Penalties", value: penaltyCount },
            ].map((item) => (
              <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              try {
                database.exec("DELETE FROM Races_GridPenalties");
                onRefresh();
                enqueueSnackbar("Cleared stored grid penalties", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to clear penalties: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Clear Grid Penalties
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              try {
                database.exec(
                  `UPDATE Parts_InspectionResults
                   SET Result = 0
                   WHERE Result IN (2, 3)`
                );
                onRefresh();
                enqueueSnackbar("Reset failed and destroyed inspections to exempt", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to reset inspections: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Clear Failed Inspections
          </Button>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Inspection Results</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={inspectionRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Parts_InspectionResults
                 SET Result = :result
                 WHERE ItemID = :itemId
                   AND RaceID = :raceId`,
                {
                  ":result": Number(newRow.Result),
                  ":itemId": newRow.ItemID,
                  ":raceId": newRow.RaceID,
                }
              );
              onRefresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update inspection result: ${error.message || error}`, { variant: "error" });
              return oldRow;
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          pageSizeOptions={[20, 40]}
          columns={[
            { field: "Race", headerName: "Race", width: 150 },
            { field: "ItemNameLabel", headerName: "Item", flex: 1, minWidth: 260 },
            { field: "LoadoutID", headerName: "Car", width: 80 },
            {
              field: "Result",
              headerName: "Result",
              width: 150,
              editable: true,
              type: "singleSelect",
              valueOptions: Object.entries(inspectionStateLabels).map(([value, label]) => ({
                value: Number(value),
                label,
              })),
              valueFormatter: ({ value }) => inspectionStateLabels[value] || value,
            },
          ]}
        />
      </section>
    </div>
  );
}
