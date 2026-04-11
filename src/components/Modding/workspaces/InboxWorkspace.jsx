import { DatabaseContext } from "@/js/Contexts";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext } from "react";

export default function InboxWorkspace({ mailRows, eventRows, onRefresh, currentDay }) {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();
  const unreadCount = mailRows.filter((row) => row.Unread).length;
  const flaggedCount = mailRows.filter((row) => row.Flagged).length;
  const recentEventCount = eventRows.filter((row) => row.Day >= currentDay - 30).length;

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Inbox Triage</div>
            <h2 className="mt-2 text-lg font-bold text-white">Mail & Event Review</h2>
            <p className="mt-2 max-w-[880px] text-sm text-slate-400">
              Mark inbox items read or flagged and keep an eye on the recent event log without touching attachment tables directly.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:min-w-[420px]">
            {[
              { label: "Unread", value: unreadCount },
              { label: "Flagged", value: flaggedCount },
              { label: "Recent Events", value: recentEventCount },
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
            color="success"
            onClick={() => {
              try {
                database.exec("UPDATE Mail_Inbox SET Unread = 0");
                onRefresh();
                enqueueSnackbar("Marked all inbox entries as read", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to update inbox: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Mark All Read
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              try {
                database.exec("UPDATE Mail_Inbox SET Flagged = 0");
                onRefresh();
                enqueueSnackbar("Cleared inbox flags", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to clear flags: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Clear All Flags
          </Button>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Inbox</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={mailRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Mail_Inbox
                 SET Unread = :unread,
                     Flagged = :flagged
                 WHERE MailID = :mailId`,
                {
                  ":unread": newRow.Unread ? 1 : 0,
                  ":flagged": newRow.Flagged ? 1 : 0,
                  ":mailId": newRow.MailID,
                }
              );
              onRefresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update mail row: ${error.message || error}`, { variant: "error" });
              return oldRow;
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          pageSizeOptions={[20, 40]}
          columns={[
            { field: "MailID", headerName: "#", width: 80 },
            { field: "Date", headerName: "Date", width: 120 },
            { field: "SubjectLabel", headerName: "Subject", flex: 1, minWidth: 260 },
            { field: "SenderLabel", headerName: "Sender", width: 180 },
            { field: "Unread", headerName: "Unread", width: 100, editable: true, type: "boolean" },
            { field: "Flagged", headerName: "Flagged", width: 100, editable: true, type: "boolean" },
            { field: "ReferenceID", headerName: "Ref", width: 90 },
          ]}
        />
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Recent Event Log</div>
        <DataGrid
          autoHeight
          hideFooter
          disableRowSelectionOnClick
          rows={eventRows}
          columns={[
            { field: "EventLogID", headerName: "#", width: 80 },
            { field: "Date", headerName: "Date", width: 120 },
            { field: "EntryTypeLabel", headerName: "Type", width: 180 },
            { field: "ReferenceID", headerName: "Ref", width: 100 },
          ]}
        />
      </section>
    </div>
  );
}
