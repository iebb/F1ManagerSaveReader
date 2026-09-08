import { resolveName, teamNames, dayToDate, getDriverCode, formatISODateLocal } from "@/js/localization";
import { getCountryFlag, getCountryShort } from "@/js/localization/ISOCountries";
import { DataGrid } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { BasicInfoContext, DatabaseContext, MetadataContext } from "@/js/Contexts";
import { getStaff } from "./commons/drivers";
import { localeStaffStats } from "./commons/staffCommon";
import ContractSwapper from "./subcomponents/ContractSwapper";
import StaffEditor from "./subcomponents/StaffEditor";
import PeopleToolbar from "./subcomponents/PeopleToolbar";
import {saveStaffRow} from "./commons/saveStaffRow";


export default function StaffDriver2024({ StaffType = 0 }) {

  const database = useContext(DatabaseContext);
  const { version } = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);
  const { enqueueSnackbar } = useSnackbar();

  const retirementDataTable = version === 2 ? "Staff_CommonData" : "Staff_GameData";
  const { weekend, player } = basicInfo;


  const [rows, setRows] = useState([]);
  const [staffStats, setStaffStats] = useState([0, 1, 14, 15, 16, 17]);

  const [updated, setUpdated] = useState(0);
  const [editRow, setEditRow] = useState(null);
  const [swapRow, setSwapRow] = useState(null);
  const [view, setView] = useState("contract");
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paginationModel, setPaginationModel] = useState({page: 0, pageSize: 20});

  const refresh = () => setUpdated((value) => value + 1);


  useEffect(() => {
    try {
      const [StaffStats, results] = getStaff({ basicInfo, database, version }, StaffType);
      // Keep column definitions stable when only row values changed.
      setStaffStats((current) => (
        current.length === StaffStats.length && current.every((stat, index) => stat === StaffStats[index])
          ? current : StaffStats
      ));
      setRows(results);
    } catch (e) {
      console.error(e);
      enqueueSnackbar(
        `The database might be corrupt`,
        { variant: "error" }
      );
    }
  }, [basicInfo, database, enqueueSnackbar, StaffType, updated, version]);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const getStatColor = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "#e2e8f0";
    }
    const clamped = Math.max(0, Math.min(100, numeric));
    const stops = [
      { at: 0, color: [239, 68, 68] },
      { at: 60, color: [234, 179, 8] },
      { at: 80, color: [34, 197, 94] },
      { at: 100, color: [59, 130, 246] },
    ];
    let left = stops[0];
    let right = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i += 1) {
      if (clamped >= stops[i].at && clamped <= stops[i + 1].at) {
        left = stops[i];
        right = stops[i + 1];
        break;
      }
    }
    const ratio = left.at === right.at ? 0 : (clamped - left.at) / (right.at - left.at);
    const color = left.color.map((channel, index) => Math.round(channel + (right.color[index] - channel) * ratio));
    return `rgb(${color.join(", ")})`;
  };

  const renderStatValue = (value) => (
    <span
      className="block w-full overflow-hidden text-right text-[14px] font-semibold"
      style={{ color: getStatColor(value) }}
    >
      {value}
    </span>
  );

  const idColumn = {
    field: 'ID',
    headerName: 'N',
    valueGetter: ({ row }) => row.StaffID,
    width: 40,
    sortable: false,
    filterable: false,
    align: "center",
    headerAlign: "center",
    renderCell: ({ row }) => (
      <div className="grid h-9 place-items-center text-center">
        <div className="text-[13px] font-semibold leading-none text-white">{row.CurrentNumber || ""}</div>
        <div className="text-[9px] uppercase tracking-[0.06em] text-slate-400">{getDriverCode(row)}</div>
      </div>
    )
  };

  const natColumn = {
    field: 'Nationality',
    headerName: 'Nat',
    valueGetter: ({ row }) => getCountryShort(row.Nationality),
    width: 30,
    sortable: false,
    filterable: false,
    align: "center",
    headerAlign: "center",
    renderCell: ({ row }) => (
      <img
        src={getCountryFlag(row.Nationality)}
        alt={row.Nationality}
        className="h-4 w-6 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
      />
    )
  };

  const nameColumn = {
    field: 'FirstName',
    valueGetter: ({ row }) => `${resolveName(row.FirstName)} ${resolveName(row.LastName)}`,
    headerName: 'Name',
    width: 124,
    renderCell: ({ row }) => (
      <div className="flex h-full w-full min-w-0 items-center overflow-hidden">
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-white">{resolveName(row.FirstName)}</div>
          <div className="truncate text-sm font-semibold text-white">{resolveName(row.LastName)}</div>
        </div>
      </div>
    )
  };

  const ratingColumn = {
    field: 'Overall',
    headerName: "Rating",
    valueGetter: ({ value }) => Number(value).toFixed(2),
    width: 76,
    type: 'number',
    renderCell: ({ value }) => (
      <span className="inline-flex w-full max-w-full items-center justify-center overflow-hidden border border-white/10 bg-white/[0.03] px-1.5 py-1 text-sm font-semibold text-white">
        {value}
      </span>
    )
  };

  const dobColumn = {
    field: 'DOB',
    headerName: "DOB",
    width: 132,
    editable: true,
    type: 'date',
    valueGetter: ({ value }) => dayToDate(value),
    renderCell: ({ value, row }) => (
      <div className="min-w-0">
        <div className="text-[12px] text-slate-200">{formatISODateLocal(value)}</div>
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-slate-500">Age {Math.floor(row.Age)}</div>
      </div>
    ),
  };

  const retireColumn = {
    field: 'RetirementAge',
    headerName: 'Retire',
    width: 120,
    editable: true,
    renderCell: ({ row }) => {
      const retirementInYears = Math.ceil(row.RetirementAge - row.Age);
      const extendedRetirementAge = retirementInYears < 5 ? row.RetirementAge + 5 - retirementInYears : row.RetirementAge;
      return row.Retired ? (
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-red-300">Retired</div>
          <button className="mt-1 text-[11px] uppercase tracking-[0.08em] text-sky-300" onClick={() => {
            database.exec(`UPDATE ${retirementDataTable} SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${row.StaffID}`);
            refresh();
          }}>Unretire</button>
        </div>
      ) : (
        <div className="min-w-0">
          <div className={`text-[12px] font-medium ${retirementInYears > 0 ? "text-slate-200" : "text-amber-300"}`}>{retirementInYears > 0 ? `In ${retirementInYears}y` : `${-retirementInYears}y ago`}</div>
          {retirementInYears < 5 && (
            <button className="mt-1 text-[11px] uppercase tracking-[0.08em] text-sky-300" onClick={() => {
              database.exec(`UPDATE ${retirementDataTable} SET RetirementAge = RetirementAge + 5 - ${retirementInYears} WHERE StaffID = ${row.StaffID}`);
              refresh();
            }}>Postpone</button>
          )}
        </div>
      );
    }
  };

  const contractColumn = {
    field: 'Salary',
    headerName: 'Contract',
    width: 180,
    editable: true,
    renderCell: ({ row }) => {
      if (!row.Contracts.length) {
        return <span className="text-sm text-slate-500">Not contracted</span>;
      }
      const Contract = row.Contracts[0];
      return (
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{formatter.format(Contract.Salary)}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <span>Until {Contract.EndSeason}</span>
            <button className="text-sky-300" onClick={() => {
              database.exec(`UPDATE Staff_Contracts SET EndSeason = EndSeason + 1 WHERE StaffID = ${row.StaffID} AND ContractType = 0 ${version <= 3 ? 'AND Accepted = 1' : ''}`);
              refresh();
            }}>+1</button>
            {Contract.EndSeason > player.CurrentSeason ? (
              <button className="text-sky-300" onClick={() => {
                database.exec(`UPDATE Staff_Contracts SET EndSeason = EndSeason - 1 WHERE StaffID = ${row.StaffID} AND ContractType = 0 ${version <= 3 ? 'AND Accepted = 1' : ''}`);
                refresh();
              }}>-1</button>
            ) : null}
          </div>
        </div>
      );
    }
  };

  const teamColumn = {
    field: 'TeamID',
    headerName: 'Team',
    width: 160,
    valueGetter: ({ row }) => row.TeamID ? row.TeamFormula * 100 + row.TeamID * 3 + row.PosInTeam : 99999,
    renderCell: ({ row }) => row.TeamID ? (
      <div className="min-w-0">
        <div style={{ color: `rgb(var(--team${row.TeamID}-triplet))` }} className="truncate text-sm font-semibold">
          {teamNames(row.TeamID, version)}
        </div>
        <div className="mt-0.5 truncate text-[11px] uppercase tracking-[0.08em] text-slate-500">
          {row.TeamFormula <= 3 ? `Driver #${row.PosInTeam}` : "Reserve"}
        </div>
      </div>
    ) : row.PreviousTeamID ? (
      <div className="min-w-0" style={{ color: `rgba(var(--team${row.PreviousTeamID}-triplet), 0.7)` }}>
        <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Previous {dayToDate(row.PreviousContractED - 1).getFullYear()}</div>
        <div className="truncate text-sm">{teamNames(row.PreviousTeamID, version)}</div>
      </div>
    ) : (
      <span className="text-slate-500">-</span>
    )
  };

  const actionsColumn = {
    field: '_',
    headerName: 'Actions',
    width: 132,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => (
      <div className="flex gap-2">
        <button
          type="button"
          className="border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-200 hover:bg-white/[0.06]"
          onClick={() => setEditRow({ ...row })}
        >
          Edit
        </button>
        <button
          type="button"
          className="border border-sky-300/20 bg-sky-500/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100 hover:bg-sky-500/[0.1]"
          onClick={() => setSwapRow({ ...row })}
        >
          Swap
        </button>
      </div>
    )
  };

  const statsColumns = useMemo(() => [
    idColumn,
    natColumn,
    nameColumn,
    teamColumn,
    ratingColumn,
    ...staffStats.map((x) => ({
      field: 'performance_stats_' + x,
      headerName: localeStaffStats["STAFF_STAT_" + x]?.slice(0, 3) || `${x}`,
      description: localeStaffStats["STAFF_STAT_" + x] || `Stat ${x}`,
      width: 56,
      editable: true,
      type: 'number',
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => renderStatValue(value),
    })),
    {
      field: 'Improvability',
      headerName: "Impr",
      description: "Improvability",
      width: 56,
      editable: true,
      type: 'number',
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => renderStatValue(value),
    },
    {
      field: 'Aggression',
      headerName: "Aggr",
      description: "Aggression",
      width: 56,
      editable: true,
      type: 'number',
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => renderStatValue(value),
    },
    ...(version === 4 ? ([
      {
        field: 'Marketability',
        headerName: "Mkt",
        description: "Marketability",
        width: 56,
        editable: true,
        type: 'number',
        align: "right",
        headerAlign: "right",
        renderCell: ({ value }) => renderStatValue(value),
      },
      {
        field: 'TargetMarketability',
        headerName: "TMk",
        description: "Target Marketability",
        width: 56,
        editable: true,
        type: 'number',
        align: "right",
        headerAlign: "right",
        renderCell: ({ value }) => renderStatValue(value),
      },
    ]) : []),
    actionsColumn,
  ], [staffStats, version, database, StaffType]);

  const contractColumns = useMemo(() => [
    idColumn,
    natColumn,
    nameColumn,
    ratingColumn,
    dobColumn,
    retireColumn,
    teamColumn,
    contractColumn,
    actionsColumn,
  ], [player.CurrentSeason, version, database, StaffType]);
  const filteredRows = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "contracted" && !(row.Contracts?.length)) {
        return false;
      }
      if (statusFilter === "available" && (row.Retired || row.Contracts?.length)) {
        return false;
      }
      if (statusFilter === "retired" && !row.Retired) {
        return false;
      }
      if (!query) {
        return true;
      }
      const fullName = `${resolveName(row.FirstName)} ${resolveName(row.LastName)}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [nameFilter, rows, statusFilter]);


  return (
    <div className="grid min-w-0 gap-3">
      {
        (weekend.WeekendStage >= 8 && StaffType === 0) && (
          <div className="border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-100">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-300">Warning</div>
            <div className="mt-1">Swapping drivers without qualifying results before a race would result in a game crash.</div>
          </div>
        )
      }
      <StaffEditor editRow={editRow} setEditRow={setEditRow} refresh={refresh} />
      <ContractSwapper swapRow={swapRow} setSwapRow={setSwapRow} refresh={refresh} />
      <PeopleToolbar
        label="Driver"
        onCreate={() => setEditRow({ __isNew: true, StaffType, IsGeneratedStaff: 1 })}
        view={view}
        onViewChange={setView}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPaginationModel((current) => ({...current, page: 0}));
        }}
        nameFilter={nameFilter}
        onNameChange={(value) => {
          setNameFilter(value);
          setPaginationModel((current) => ({...current, page: 0}));
        }}
        count={filteredRows.length}
      />
      <div className="min-w-0 overflow-x-auto border border-white/10 bg-black/10">
        <DataGrid
          rowHeight={60}
          columnHeaderHeight={44}
          rows={filteredRows}
          getRowId={r => r.StaffID}
          isCellEditable={({ field, value }) => {
            if (field === "Salary") {
              return value > 0;
            }
            return true;
          }}
          onProcessRowUpdateError={(error) => enqueueSnackbar(error.message || "Could not save this edit.", {variant: "error"})}
          processRowUpdate={(newRow, oldRow) => {
            const savedRow = saveStaffRow({database, version, staffType: StaffType, staffStats}, newRow, oldRow);
            refresh();
            return savedRow;
          }}
          columns={view === "stats" ? statsColumns : contractColumns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableRowSelectionOnClick
          pageSizeOptions={[20, 50, 100]}
        />
      </div>
    </div>
  );
}
