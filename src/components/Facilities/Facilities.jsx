import { BasicInfoContext, DatabaseContext, MetadataContext, UiSettingsContext } from "@/js/Contexts";
import { getOfficialTeamLogo } from "@/components/Common/teamLogos";
import { Edit, KeyboardDoubleArrowDown, KeyboardDoubleArrowUp, Refresh } from '@mui/icons-material';
import { DataGrid } from "@mui/x-data-grid";
import { resolveLiteral, teamNames } from "@/js/localization";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import TeamSize from "@/components/Staff/TeamSize";

export const BuildingsCategorized = [
  {
    id: 0,
    category: "Car Development",
    buildings: [
      { id: 3, name: "Factory" }, // [Building_Factory0]
      { id: 2, name: "Design Centre" }, // [Building_DesignCentre0]
      { id: 5, name: "Wind Tunnel" }, // [Building_WindTunnel0]
      { id: 6, name: "CFD Simulator" }, // [Building_CFDSim0]
      { id: 7, name: "Suspension Sim" }, // [Building_SuspensionSim0]
      { id: 8, name: "Car Part Test" }, // [Building_TestAndDevCentre0]
    ],
  },
  {
    id: 1,
    category: "Staff",
    buildings: [
      { id: 9, name: "Team Hub" }, // [Building_StaffFacility0]
      { id: 14, name: "Scouting Dept" }, // [Building_ScoutingSubDepartment0]
      { id: 4, name: "Race Simulator" }, // [Building_DriverInLoopSimulator0]
      // {id: 16, name: "Health Centre"}, // [Building_MedicalBayUpgrade0]
    ],
  },
  {
    id: 2,
    category: "Operations",
    buildings: [
      { id: 15, name: "Board Room" }, // [Building_BoardroomUpgrade0]
      { id: 13, name: "Hospitality Area" }, // [Building_UpgradedHospitality0]
      { id: 1, name: "Weather Centre" }, // [Building_DataCentre0]
      { id: 10, name: "Helipad" }, // [Building_Helipad0]
      { id: 11, name: "Memorabilia" }, // [Building_TrophyRoom0]
      { id: 12, name: "Tour Centre" }, // [Building_TourCentre0]
    ],
  },
]

const facilityPanels = [
  {
    id: 0,
    name: "Car Development",
    eyebrow: "Performance infrastructure",
    description: "Factory, aero, simulation, and testing facilities that shape raw car development.",
  },
  {
    id: 1,
    name: "Staff",
    eyebrow: "Team environment",
    description: "Driver-facing and support facilities around the HQ.",
  },
  {
    id: 2,
    name: "Operations",
    eyebrow: "Business and logistics",
    description: "Commercial and operational infrastructure around the headquarters.",
  },
  {
    id: 3,
    name: "Engineering & Scouting",
    eyebrow: "Headcount control",
    description: "Adjust engineering and scouting headcount for each team in one place.",
  },
];

function getBuildingStateDetails(version, building) {
  if (!building) {
    return {
      label: "Unavailable",
      detail: "No building record",
      tone: "text-slate-400",
    };
  }

  const statesV2 = [
    { label: "Unknown", detail: "", tone: "text-slate-500" },
    { label: "Unknown", detail: "", tone: "text-slate-500" },
    { label: "Constructing", detail: `${building.WorkDone}% complete`, tone: "text-sky-300" },
    { label: "Operational", detail: "Open and usable", tone: "text-emerald-300" },
    { label: "Refurbishing", detail: `${building.WorkDone}/${building.RefurbishWork}`, tone: "text-amber-300" },
    { label: "Upgrading", detail: `${building.WorkDone}/${building.NextConstructionWork}`, tone: "text-violet-300" },
  ];

  const statesDefault = [
    { label: "Unknown", detail: "", tone: "text-slate-500" },
    { label: "Constructing", detail: `${building.WorkDone}% complete`, tone: "text-sky-300" },
    { label: "Operational", detail: "Open and usable", tone: "text-emerald-300" },
    { label: "Refurbishing", detail: `${building.WorkDone}/${building.RefurbishWork}`, tone: "text-amber-300" },
    { label: "Upgrading", detail: `${building.WorkDone}/${building.NextConstructionWork}`, tone: "text-violet-300" },
  ];

  return (version === 2 ? statesV2 : statesDefault)[building.BuildingState] || {
    label: "Unknown",
    detail: "",
    tone: "text-slate-500",
  };
}

function getLevelTone(level) {
  return [
    "border-white/10 bg-[linear-gradient(180deg,rgba(71,85,105,0.18),rgba(15,23,42,0.28))] text-slate-300",
    "border-orange-500/25 bg-[linear-gradient(180deg,rgba(249,115,22,0.18),rgba(124,45,18,0.2))] text-orange-100",
    "border-yellow-300/25 bg-[linear-gradient(180deg,rgba(253,224,71,0.2),rgba(113,63,18,0.18))] text-yellow-100",
    "border-lime-400/25 bg-[linear-gradient(180deg,rgba(163,230,53,0.14),rgba(54,83,20,0.2))] text-lime-100",
    "border-sky-400/25 bg-[linear-gradient(180deg,rgba(56,189,248,0.16),rgba(14,65,110,0.2))] text-sky-100",
    "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(52,211,153,0.16),rgba(6,78,59,0.22))] text-emerald-100",
  ][Math.max(0, Math.min(5, Number(level) || 0))];
}

function getConditionTone(condition) {
  if (condition >= 90) return "text-emerald-300";
  if (condition >= 75) return "text-lime-300";
  if (condition >= 55) return "text-amber-300";
  return "text-rose-300";
}

function getUpgradeProgress(version, building) {
  if (!building) {
    return null;
  }

  const isUpgrading = version === 2 ? building.BuildingState === 5 : building.BuildingState === 4;
  if (!isUpgrading || !building.NextConstructionWork) {
    return null;
  }

  return {
    from: building.UpgradeLevel,
    to: Math.min(5, building.UpgradeLevel + 1),
    ratio: Math.max(0, Math.min(1, building.WorkDone / building.NextConstructionWork)),
    label: `${building.WorkDone}/${building.NextConstructionWork}`,
  };
}

function getTeamTextStyle(teamId) {
  return {color: `rgb(var(--team${teamId}-triplet))`};
}

function FacilityActionButton({ label, title, disabled, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 items-center justify-center border border-white/10 bg-black/20 text-[11px] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-default disabled:opacity-35"
      aria-label={label}
    >
      {children}
    </button>
  );
}

export default function Facilities() {

  const database = useContext(DatabaseContext);
  const { version, careerSaveMetadata } = useContext(MetadataContext)
  const { logoStyle = "colored" } = useContext(UiSettingsContext);
  const { teamIds, teamMap, player } = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;

  const [buildings, setBuildings] = useState([]);
  const [partPanel, setPartPanel] = useState(0);
  const isStaffingTab = partPanel === BuildingsCategorized.length;
  const activePanel = facilityPanels[partPanel] || facilityPanels[0];

  const BuildingsCategorizedPage = isStaffingTab ? [] : BuildingsCategorized[partPanel].buildings;


  useEffect(() => {
    const buildings = {};
    const [{ columns, values }] = database.exec(
      `SELECT Buildings_HQ.*, Buildings.*, 
            NextLevel.BuildingID as NextBuildingID, PrevLevel.BuildingID as PrevBuildingID, NextLevel.ConstructionWork as NextConstructionWork FROM Buildings_HQ 
            LEFT JOIN Buildings ON Buildings_HQ.BuildingID = Buildings.BuildingID
            LEFT JOIN Buildings as NextLevel ON Buildings.Type = NextLevel.Type AND Buildings.UpgradeLevel + 1 = NextLevel.UpgradeLevel
            LEFT JOIN Buildings as PrevLevel ON Buildings.Type = PrevLevel.Type AND Buildings.UpgradeLevel - 1 = PrevLevel.UpgradeLevel
            `
    );
    for (const r of values) {
      let row = {};
      r.map((x, _idx) => { row[columns[_idx]] = x });
      if (!buildings[row.TeamID]) {
        buildings[row.TeamID] = {};
      }

      buildings[row.TeamID]["building_" + row.BuildingType] = row;
      buildings[row.TeamID]["UpgradeLevel_" + row.BuildingType] = row.UpgradeLevel;
      buildings[row.TeamID]["DegradationValue_" + row.BuildingType] = row.DegradationValue;
    }
    setBuildings(
      teamIds.filter(teamIndex => buildings[teamIndex]).map(
        teamIndex => ({
          id: teamIndex,
          TeamID: teamIndex,
          ...buildings[teamIndex]
        })
      )
    );
  }, [database, updated])

  const columns = [];
  for (const stat of BuildingsCategorizedPage) {
    columns.push({
      field: `UpgradeLevel_` + stat.id,
      headerName: stat.name,
      minWidth: 168,
      flex: 1,
      type: 'singleSelect',
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      valueOptions: [
        { value: 0, label: "Not Built" },
        { value: 1, label: "Lv 1" },
        { value: 2, label: "Lv 2" },
        { value: 3, label: "Lv 3" },
        { value: 4, label: "Lv 4" },
        { value: 5, label: "Lv 5" },
      ],
      valueGetter: ({ value }) => Number(value),
      renderHeader: () => (
        <div className="flex h-full items-center py-1">
          <span className="text-xs font-semibold text-slate-200">{stat.name}</span>
        </div>
      ),
      renderCell: ({ row, value }) => {
        const b = row["building_" + stat.id];
        const condition = Number(row[`DegradationValue_${stat.id}`]) * 100;
        const isBuilt = Number(value) > 0;
        const upgradeProgress = getUpgradeProgress(version, b);
        return (
          <div className="flex h-full w-full items-center py-1.5">
            <div className="flex w-full items-center gap-2">
              <div className="shrink-0">
                {!isBuilt ? (
                  <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/10 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    N/B
                  </div>
                ) : upgradeProgress ? (
                  <div className="relative h-10 w-10 overflow-hidden border border-sky-400/20 bg-sky-500/8 text-sky-100">
                    <div className="flex h-[20px] items-center justify-center border-b border-white/10 text-[12px] font-semibold uppercase tracking-[0.08em]">
                      {upgradeProgress.from} ▲
                    </div>
                    <div className="relative h-[20px]">
                      <div
                        className="absolute inset-y-0 left-0 bg-sky-400/20"
                        style={{ width: `${upgradeProgress.ratio * 100}%` }}
                      />
                      <div className="relative z-[1] flex h-full items-center justify-center px-1 text-[8px] font-medium text-slate-200">
                        {upgradeProgress.label}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex h-10 w-10 items-center justify-center border text-lg font-semibold ${getLevelTone(value)}`}>
                    {value}
                  </div>
                )}
              </div>

              <div className="grid shrink-0 justify-items-start gap-1">
                {isBuilt ? (
                  <div className="flex items-center gap-1">
                    <FacilityActionButton
                      label="Edit condition"
                      title="Edit condition"
                      onClick={() => {
                        const nextValue = window.prompt("Set facility condition (0-100)", condition.toFixed(1));
                        if (nextValue === null) {
                          return;
                        }
                        const parsed = Number(nextValue);
                        if (Number.isNaN(parsed)) {
                          return;
                        }
                        database.exec(`UPDATE Buildings_HQ SET DegradationValue = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                          ":teamID": row.TeamID,
                          ":bType": stat.id,
                          ":value": Math.max(0, Math.min(1, parsed / 100)),
                        })
                        refresh();
                      }}
                    >
                      <Edit fontSize="inherit" />
                    </FacilityActionButton>
                    <div className={`text-[10px] font-semibold ${getConditionTone(condition)}`}>{condition.toFixed(1)}%</div>
                  </div>
                ) : null}
                <div className="flex gap-1">
                  <FacilityActionButton
                    label="Upgrade"
                    title="Upgrade"
                    disabled={!b.NextBuildingID}
                    onClick={() => {
                      database.exec(`UPDATE Buildings_HQ SET BuildingID = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                        ":teamID": row.TeamID,
                        ":bType": stat.id,
                        ":value": b.NextBuildingID,
                      })
                      if (b.UpgradeLevel === 4 && b.BuildingState === 4) {
                        database.exec(
                          `UPDATE Buildings_HQ SET BuildingState = 2, DegradationValue = 1, WorkDone = 0 WHERE TeamID = :teamID AND BuildingType = :bType`, {
                          ":teamID": row.TeamID,
                          ":bType": stat.id,
                        })
                      }
                      refresh();
                    }}
                  >
                    <KeyboardDoubleArrowUp fontSize="inherit" />
                  </FacilityActionButton>
                  <FacilityActionButton
                    label="Downgrade"
                    title="Downgrade"
                    disabled={!b.PrevBuildingID}
                    onClick={() => {
                      database.exec(`UPDATE Buildings_HQ SET BuildingID = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                        ":teamID": row.TeamID,
                        ":bType": stat.id,
                        ":value": b.PrevBuildingID,
                      })
                      refresh();
                    }}
                  >
                    <KeyboardDoubleArrowDown fontSize="inherit" />
                  </FacilityActionButton>
                  {isBuilt ? (
                    <FacilityActionButton
                      label="Refurbish"
                      title="Refurbish"
                      disabled={row[`DegradationValue_${stat.id}`] >= 1}
                      onClick={() => {
                        database.exec(`UPDATE Buildings_HQ SET DegradationValue = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                          ":teamID": row.TeamID,
                          ":bType": stat.id,
                          ":value": 1,
                        })
                        refresh();
                      }}
                    >
                      <Refresh fontSize="inherit" />
                    </FacilityActionButton>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      },
    })
  }




  return (
    <div className="grid gap-3">
      <div className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <h2 className="text-lg font-bold text-white">Facilities Workspace</h2>
        <p className="mt-2 max-w-[920px] text-sm text-slate-400">
          Review upgrade level, wear, and quick actions across every team from one management view.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-4">
          {facilityPanels.map((panel) => {
            const selected = panel.id === partPanel;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => setPartPanel(panel.id)}
                className={`border px-4 py-3 text-left transition ${selected
                  ? "border-sky-300/60 bg-sky-600/15"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
              >
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{panel.eyebrow}</div>
                <div className="mt-1 text-sm font-bold text-white">{panel.name}</div>
                <div className="mt-2 text-xs leading-5 text-slate-400">{panel.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.015] px-5 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{activePanel.eyebrow}</div>
            <div className="mt-1 text-base font-bold text-white">
              {activePanel.name}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {activePanel.description}
            </p>
          </div>
          {!isStaffingTab ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              {BuildingsCategorizedPage.map((building) => (
                <span key={building.id} className="border border-white/10 bg-black/10 px-2.5 py-1">
                  {building.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 border border-white/10 bg-black/10 p-2">
        {isStaffingTab ? (
          <TeamSize />
        ) : (
          <DataGrid
            className="facility-grid"
            rows={buildings}
            getRowId={r => r.TeamID}
            disableColumnFilter
            disableColumnMenu
            disableColumnSelector
            disableDensitySelector
            rowHeight={62}
            columnHeaderHeight={44}
            sx={{
              border: 0,
              color: "#e5e7eb",
              backgroundColor: "transparent",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              },
              "& .MuiDataGrid-columnHeader": {
                paddingInline: "10px",
              },
              "& .MuiDataGrid-columnHeaderTitleContainer": {
                padding: 0,
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                paddingInline: "10px",
                alignItems: "stretch",
              },
              "& .MuiDataGrid-row:nth-of-type(odd)": {
                backgroundColor: "rgba(255,255,255,0.015)",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "rgba(255,255,255,0.035)",
              },
              "& .MuiDataGrid-virtualScroller": {
                minHeight: 320,
              },
            }}
            onProcessRowUpdateError={e => console.error(e)}
            processRowUpdate={(newRow, oldRow) => {
              for (const stat of BuildingsCategorizedPage) {
                if (newRow['DegradationValue_' + stat.id] !== oldRow['DegradationValue_' + stat.id]) {
                  database.exec(
                    `UPDATE Buildings_HQ SET DegradationValue = :value WHERE TeamID = :teamID AND BuildingType = :Type`, {
                    ":teamID": newRow.TeamID,
                    ":value": newRow['DegradationValue_' + stat.id],
                    ":Type": newRow['building_' + stat.id].BuildingType,
                  })
                }
                if (newRow['UpgradeLevel_' + stat.id] !== oldRow['UpgradeLevel_' + stat.id]) {
                  const newBuildingID = newRow['building_' + stat.id].BuildingType * 10 + newRow['UpgradeLevel_' + stat.id];
                  database.exec(
                    `UPDATE Buildings_HQ SET BuildingID = :value WHERE TeamID = :teamID AND BuildingType = :Type`, {
                    ":teamID": newRow.TeamID,
                    ":value": newBuildingID,
                    ":Type": newRow['building_' + stat.id].BuildingType,
                  })
                  if (newRow['UpgradeLevel_' + stat.id] === 5 && newRow['building_' + stat.id].BuildingState === 4) {
                    database.exec(
                      `UPDATE Buildings_HQ SET BuildingState = 2, DegradationValue = 1, WorkDone = 0 WHERE TeamID = :teamID AND BuildingType = :Type`, {
                      ":teamID": newRow.TeamID,
                      ":Type": newRow['building_' + stat.id].BuildingType,
                    })
                  }
                }
              }
              refresh();
              return newRow;
            }}
            columns={[
              {
                field: 'TeamID',
                headerName: "Team",
                width: 178,
                sortable: false,
                renderHeader: () => (
                  <div className="flex h-full items-center py-1">
                    <span className="text-xs font-semibold text-slate-200">Team</span>
                  </div>
                ),
                renderCell: ({ value }) => {
                  const logoSrc = value >= 32 && customTeamLogoBase64
                    ? `data:image/png;base64,${customTeamLogoBase64}`
                    : getOfficialTeamLogo(version, value, logoStyle);
                return (
                  <div className="flex h-full items-center gap-2 py-1.5">
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                          alt=""
                          className="h-6 w-6 shrink-0 object-contain opacity-95"
                        />
                      ) : null}
                      <div
                        className="min-w-0 truncate text-[13px] font-medium leading-5"
                        style={getTeamTextStyle(value)}
                      >
                        {value >= 32 && teamMap?.[value]?.TeamNameLocKey
                          ? resolveLiteral(teamMap[value].TeamNameLocKey)
                          : teamNames(value, version)}
                      </div>
                    </div>
                  )
                },
              },
              ...columns,
            ]}
            hideFooter
          />
        )}
      </div>
    </div>
  );
}
