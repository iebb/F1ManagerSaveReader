import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "@/js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {TeamName} from "../Localization/Localization";

const subTeams = [
  {id: 0, name: "Engineers"},
  {id: 1, name: "Scouts"},
]

export default function TeamSize() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext);
  const {teamIds} = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [subTeamStats, setSubTeamStats] = useState([]);


  useEffect(() => {
    const subTeamStats = {};
    for(const r of database.getAllRows(
      `SELECT * FROM SubTeam_Ownership LEFT JOIN SubTeam_Enum_Types ON SubTeamType = Type`
    )) {
      if (!subTeamStats[r.TeamID]) {
        subTeamStats[r.TeamID] = {};
      }
      subTeamStats[r.TeamID]["team_" + r.SubTeamType ] = r.TotalStaff;
      subTeamStats[r.TeamID]["cost_" + r.SubTeamType ] = r.TotalStaff * r.MonthlyRunCost;
    }
    setSubTeamStats(
      teamIds.map(
        teamIndex => ({
          id: teamIndex,
          TeamID: teamIndex,
          ...subTeamStats[teamIndex]
        })
      )
    );
  }, [database, updated])

  return (
    <div>
      <DataGrid
        rows={subTeamStats}
        getRowId={r => r.TeamID}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const t of subTeams) {
            if (newRow['team_' + t.id] !== oldRow['team_' + t.id]) {
              database.exec(`UPDATE SubTeam_Ownership SET TotalStaff = :value WHERE TeamID = :teamID AND SubTeamType = :stt`, {
                ":teamID": newRow.TeamID,
                ":stt": t.id,
                ":value": newRow['team_' + t.id],
              })
            }
          }

          refresh();
          return newRow;
        }}
        columns={[
          {
            field: 'id',
            headerName: "#",
            width: 50,
          },
          {
            field: 'TeamID',
            headerName: "Team",
            width: 120,
            renderCell: ({ value }) => <TeamName TeamID={value} type="fanfare" />,
          },
          ...subTeams.map(t => ({
            field: `team_` + t.id,
            headerName: t.name,
            type: 'number',
            flex: 1,
            valueGetter: ({value}) => parseInt(value, 10),
            renderCell: ({row, value}) => {
              return (
                <div className="text-right pr-2">
                  <span>{Number(value)}</span>
                  <br/>
                  <span className="text-gray-500">${Number(row[`cost_` + t.id] / 1000).toFixed(1)}k/m</span>
                </div>
              )
            },
            editable: true,
          }))
        ]}
        hideFooter
      />
    </div>
  );
}