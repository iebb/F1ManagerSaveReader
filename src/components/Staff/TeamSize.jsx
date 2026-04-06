import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {resolveLiteral, teamNames} from "@/js/localization";
import {Add, Edit, Remove} from "@mui/icons-material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";

const teamLogoAssets = import.meta.glob("../../assets/team-logos/**/*.{png,webp}", {
  eager: true,
  import: "default",
});

const teamLogoSlugsByYear = {
  2022: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
  2023: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
  2024: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas", 8: "rb", 9: "kicksauber", 10: "astonmartin"},
  2025: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "kicksauber", 10: "astonmartin"},
  2026: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "audi", 10: "astonmartin", 11: "cadillac"},
};

const subTeams = [
  {id: 0, name: "Engineers"},
  {id: 1, name: "Scouts"},
];

function getOfficialTeamLogo(version, teamId) {
  const year = Math.min(2026, Math.max(2022, version + 2020));
  const slug = teamLogoSlugsByYear[year]?.[teamId];
  if (!slug) return null;
  const extension = year <= 2023 ? "png" : "webp";
  return teamLogoAssets[`../../assets/team-logos/${year}/${slug}.${extension}`] || null;
}

function getTeamTextStyle(teamId) {
  return {color: `rgb(var(--team${teamId}-triplet))`};
}

function ActionButton({title, onClick, children}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center border border-white/10 bg-black/20 text-[10px] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </button>
  );
}

export default function TeamSize() {
  const database = useContext(DatabaseContext);
  const {version, careerSaveMetadata} = useContext(MetadataContext);
  const {teamIds, teamMap, player} = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const [subTeamStats, setSubTeamStats] = useState([]);
  const refresh = () => setUpdated(Date.now());
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;

  useEffect(() => {
    const nextStats = {};
    for (const row of database.getAllRows(`SELECT * FROM SubTeam_Ownership LEFT JOIN SubTeam_Enum_Types ON SubTeamType = Type`)) {
      if (!nextStats[row.TeamID]) {
        nextStats[row.TeamID] = {};
      }
      nextStats[row.TeamID][`team_${row.SubTeamType}`] = row.TotalStaff;
      nextStats[row.TeamID][`cost_${row.SubTeamType}`] = row.TotalStaff * row.MonthlyRunCost;
    }

    setSubTeamStats(
      teamIds.map((teamIndex) => ({
        id: teamIndex,
        TeamID: teamIndex,
        ...nextStats[teamIndex],
      }))
    );
  }, [database, teamIds, updated]);

  const updateSubTeam = (row, subTeam, nextValue) => {
    const clampedValue = Math.max(0, Math.round(nextValue));
    if (clampedValue === Number(row[`team_${subTeam.id}`] || 0)) {
      return;
    }

    database.exec(`UPDATE SubTeam_Ownership SET TotalStaff = :value WHERE TeamID = :teamID AND SubTeamType = :stt`, {
      ":teamID": row.TeamID,
      ":stt": subTeam.id,
      ":value": clampedValue,
    });
    refresh();
  };

  return (
    <div className="min-w-0 border border-white/10 bg-black/10 p-2">
      <DataGrid
        rows={subTeamStats}
        getRowId={(row) => row.TeamID}
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
        columns={[
          {
            field: "TeamID",
            headerName: "Team",
            width: 190,
            sortable: false,
            renderHeader: () => (
              <div className="flex h-full items-center py-1">
                <span className="text-xs font-semibold text-slate-200">Team</span>
              </div>
            ),
            renderCell: ({value}) => {
              const logoSrc = value >= 32 && customTeamLogoBase64
                ? `data:image/png;base64,${customTeamLogoBase64}`
                : getOfficialTeamLogo(version, value);
              const teamLabel = value >= 32 && teamMap?.[value]?.TeamNameLocKey
                ? resolveLiteral(teamMap[value].TeamNameLocKey)
                : teamNames(value, version);
              return (
                <div className="flex h-full items-center gap-2 py-1.5">
                  {logoSrc ? <img src={logoSrc} alt="" className="h-6 w-6 shrink-0 object-contain opacity-95" /> : null}
                  <div className="min-w-0 truncate text-[13px] font-medium leading-5" style={getTeamTextStyle(value)}>
                    {teamLabel}
                  </div>
                </div>
              );
            },
          },
          ...subTeams.map((subTeam) => ({
            field: `team_${subTeam.id}`,
            headerName: subTeam.name,
            minWidth: 150,
            flex: 1,
            sortable: false,
            renderHeader: () => (
              <div className="flex h-full items-center py-1">
                <span className="text-xs font-semibold text-slate-200">{subTeam.name}</span>
              </div>
            ),
            renderCell: ({row}) => {
              const value = Number(row[`team_${subTeam.id}`] || 0);
              const monthlyCost = Number(row[`cost_${subTeam.id}`] || 0);
              return (
                <div className="flex h-full w-full items-center py-1.5">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="grid min-h-[34px] min-w-0 content-between gap-0.5 self-stretch">
                      <div className="text-[15px] font-semibold leading-none text-slate-100">{value}</div>
                      <div className="self-end text-[9px] leading-none text-slate-500">
                        ${(monthlyCost / 1000).toFixed(1)}k/m
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="h-5 w-5" />
                      <ActionButton
                        title="Edit"
                        onClick={() => {
                          const nextValue = window.prompt(`Set ${subTeam.name}`, value.toString());
                          if (nextValue === null) return;
                          const parsed = Number(nextValue);
                          if (Number.isNaN(parsed)) return;
                          updateSubTeam(row, subTeam, parsed);
                        }}
                      >
                        <Edit fontSize="inherit" />
                      </ActionButton>
                      <ActionButton title="-10" onClick={() => updateSubTeam(row, subTeam, value - 10)}>
                        <Remove fontSize="inherit" />
                      </ActionButton>
                      <ActionButton title="+10" onClick={() => updateSubTeam(row, subTeam, value + 10)}>
                        <Add fontSize="inherit" />
                      </ActionButton>
                    </div>
                  </div>
                </div>
              );
            },
          })),
        ]}
        hideFooter
      />
    </div>
  );
}
