import {circuitNames, countryNames, getDriverName} from "@/js/localization";
import {Button, Divider, Typography} from "@mui/material";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {repack} from "../../js/fileAnalyzer";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext, EnvContext} from "../Contexts";


export const CarSetupParams = [
  {
    // name: "Front Wing Angle",
    name: "Front Angle",
    index: 0,
    min: 0,
    max: 10,
    step: 0.5,
    decimals: 1,
    effect: [99/32, (-3)/8, (-3)/2, 9/32, (-115)/64],
    render: x => x.toFixed(1),
  },
  {
    // name: "Rear Wing Angle",
    name: "Rear Angle",
    index: 1,
    min: 9,
    max: 16,
    step: 0.5,
    decimals: 1,
    effect: [(-11)/32, 1/24, 1/6, (-1)/32, (-175)/192],
    render: x => x.toFixed(1),
  },
  {
    name: "Anti-Roll",
    index: 2,
    min: 1,
    max: 9,
    step: 1,
    decimals: 0,
    effect: [7/16, 1/4, 1, 37/16, 25/32],
    render: x => {
      if (Math.abs(Math.round(x) - x) < 1e-6) {
        return `${(10-x).toFixed(0)}:${x.toFixed(0)}`
      }
      return `${(10-x).toFixed(2)}:${x.toFixed(2)}`
    },
  },
  {
    name: "Tyre Camber",
    index: 3,
    min: 2.7,
    max: 3.5,
    step: 0.05,
    decimals: 2,
    effect: [(-53)/16, 23/12, 23/3, 17/16, 415/96],
    render: x => `-${x.toFixed(2)}°`,
  },
  {
    name: "Toe-Out",
    index: 4,
    min: 0,
    max: 1,
    step: 0.05,
    decimals: 2,
    effect: [(-33)/32, 163/24, 43/6, (-3)/32, 755/192],
    render: x => `${x.toFixed(2)}°`,
  },
];
export default function CarSetup() {

  const database = useContext(DatabaseContext);
  const env = useContext(EnvContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const [rows, setRows] = useState([]);
  const [teamOnly, setTeamOnly] = useState(true);

  const {driverMap, teamMap, weekend, player, races } = basicInfo;
  const trackId = weekend.RaceID > 0 ? races[weekend.RaceID].TrackID : player.LastRaceTrackID;

  useEffect(() => {
    let values;
    try {

      [{ values }] = database.exec(
        "select LoadOutID, TeamID, PerfectSetupFrontWingAngle, PerfectSetupRearWingAngle, PerfectSetupAntiRollBars, PerfectSetupCamber, PerfectSetupToe  from Save_CarConfig"
      );
      const _rows = values.map(val => ({
        LoadOutID: val[0],
        TeamID: val[1],
        Team: teamMap[val[1]],
        Setups: [val[2], val[3], val[4], val[5], val[6]],
      }));
      setRows(_rows);
    } catch {

    }

  }, [database])


  return (
    <div>
      {
        weekend.RaceID < 0 ? (
          <>
            <span style={{ color: "yellow", fontSize: 18 }}>
              You are not in a race weekend. Please save inside a race weekend.
            </span>
            <br/>
          </>
        ) : (
          <>
            <Typography variant="h5" component="h5">
              Perfect Car Setups for {circuitNames[trackId]}, {countryNames[trackId]}
            </Typography>
            <Divider variant="fullWidth" sx={{ my: 2 }} />
            <Typography variant="p" component="p" sx={{ color: "orange" }}>
              <Button color="warning" variant="contained" sx={{ mr: 2 }} onClick={() => {
                database.exec(
                  "Update Save_CarConfig SET " +
                  "CurrentSetupFrontWingAngle = PerfectSetupFrontWingAngle, BestSetupFrontWingAngle = PerfectSetupFrontWingAngle, " +
                  "CurrentSetupAntiRollBars = PerfectSetupAntiRollBars, BestSetupAntiRollBars = PerfectSetupAntiRollBars, " +
                  "CurrentSetupCamber = PerfectSetupCamber, BestSetupCamber = PerfectSetupCamber, " +
                  "CurrentSetupToe = PerfectSetupToe, BestSetupToe = PerfectSetupToe, " +
                  "CurrentSetupRearWingAngle = PerfectSetupRearWingAngle, BestSetupRearWingAngle = PerfectSetupRearWingAngle " +
                  `WHERE TeamID = ${basicInfo.player.TeamID}`
                );
                repack(database, metadata, true);
              }}>
                {
                  env.inApp ? "Modify Savefile to Optimal" : "Export Optimal Savefile"
                }
              </Button>
              <Button color="secondary" variant="contained" sx={{ mr: 2 }} onClick={() => {
                database.exec(
                  "Update Save_CarConfig SET " +
                  "CurrentSetupFrontWingAngle = PerfectSetupFrontWingAngle, BestSetupFrontWingAngle = PerfectSetupFrontWingAngle, " +
                  "CurrentSetupAntiRollBars = PerfectSetupAntiRollBars, BestSetupAntiRollBars = PerfectSetupAntiRollBars, " +
                  "CurrentSetupCamber = PerfectSetupCamber, BestSetupCamber = PerfectSetupCamber, " +
                  "CurrentSetupToe = PerfectSetupToe, BestSetupToe = PerfectSetupToe, " +
                  "CurrentSetupRearWingAngle = PerfectSetupRearWingAngle, BestSetupRearWingAngle = PerfectSetupRearWingAngle " +
                  `WHERE TeamID = ${basicInfo.player.TeamID}`
                );
              }}>
                {
                  "Update to Optimal without Exporting"
                }
              </Button>
            </Typography>
            <Divider variant="fullWidth" sx={{ my: 2 }} />
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Team / Driver</TableCell>
                    {
                      CarSetupParams.map(p => {
                        return <TableCell align="right" key={p.index}>{p.name}</TableCell>
                      })
                    }
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.filter(teamOnly ? (row => basicInfo.player.TeamID === row.TeamID) : () => true).map(row => ({
                    ...row,
                    order: (basicInfo.player.TeamID === row.TeamID ? 0 : row.TeamID) * 100 + row.LoadOutID
                  })).sort((x, y) => x.order - y.order).map((row) => (
                    <TableRow
                      key={`${row.TeamID}_${row.LoadOutID}`}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      style={basicInfo.player.TeamID === row.TeamID ? { background: "#333333" } : {}}
                    >
                      <TableCell component="th" scope="row">
                        {
                          getDriverName(driverMap[row.Team[`Driver${row.LoadOutID === 0 ?  1: 2}ID`]])
                        }
                        <br />
                        <sub>{row.Team.TeamName}</sub>
                      </TableCell>
                      {
                        CarSetupParams.map(p => {
                          const val = p.render(p.min + (p.max - p.min) * row.Setups[p.index]);
                          return <TableCell style={{ fontSize: 18 }} align="right" key={p.index}>{val}</TableCell>
                        })
                      }
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )
      }

    </div>
  );
}