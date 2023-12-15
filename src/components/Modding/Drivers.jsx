import {getDriverCode, resolveName, teamNames} from "@/js/localization";
import {Divider, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import {useContext, useEffect, useState} from "react";
import {getCountryFlag, getCountryShort} from "../../js/countries";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../Contexts";
import {getDrivers} from "./commons/drivers";
import ContractSwapper from "./subcomponents/ContractSwapper";
import DriverEditor from "./subcomponents/DriverEditor";

const StaffPerformance = [
  "Impr",
  "Aggr", // hack
  "Corn",
  "Brak",
  "Cntl",
  "Smth",
  "Adpt",
  "Ovtk",
  "Dfce",
  "Acel",
  "Accu",
]

export default function DriverView() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);

  const [updated, setUpdated] = useState(0);
  const [editRow, setEditRow] = useState(null);
  const [swapRow, setSwapRow] = useState(null);

  const refresh = () => setUpdated(+new Date());


  useEffect(() => {
    try {
      setRows(getDrivers({ database, version }));
    } catch {
      enqueueSnackbar(
        `The database might be corrupt`,
        { variant: "danger" }
      );
    }
  }, [database, updated])

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });


  return (
    <div>
      <DriverEditor editRow={editRow} setEditRow={setEditRow} refresh={refresh} />
      <ContractSwapper swapRow={swapRow} setSwapRow={setSwapRow} refresh={refresh} />
      <Typography variant="h5" component="h5">
        Driver Database
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <DataGrid
        rows={rows}
        getRowId={r => r.StaffID}
        columns={[
          {
            field: 'CurrentNumber',
            headerName: '#',
            valueGetter: ({ row }) => row.CurrentNumber || 99999,
            width: 40,
            renderCell: ({ row }) => {
              return (
                <div style={{ fontSize: "90%" }}>
                  {
                    row.CurrentNumber
                  }
                  <br />
                  {
                    getDriverCode(row)
                  }
                </div>
              )
            }
          },
          {
            field: 'Nationality',
            headerName: 'Nat',
            valueGetter: ({ row }) => getCountryShort(row.Nationality),
            width: 30,
            renderCell: ({ row }) => {
              return (
                <img src={getCountryFlag(row.Nationality)} style={{ width: 24 }}/>
              )
            }
          },
          {
            field: 'StaffID',
            headerName: 'Name',
            width: 150,
            renderCell: ({ row }) => {
              return (
                <div>
                  {resolveName(row.FirstName)}
                  <br />
                  {resolveName(row.LastName)}
                </div>
              )
            }
          },
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => (
            {
              field: 'performanceStats.' + x , headerName: StaffPerformance[x], width: 25,
              // editable: true,
              type: 'number',
              renderCell: ({ row }) => row.performanceStats[x],
            }
          )),
          {
            field: 'Improvability' , headerName: "Impr", width: 25,
          },
          {
            field: 'Aggression' , headerName: "Aggr", width: 25,
          },
          {
            field: 'Retirement',
            headerName: 'Retirement',
            width: 130,
            renderCell: ({ row }) => {
              const retirementInYears = Math.ceil(row.RetirementAge - (basicInfo.player.Day - row.DOB) / 365.25);
              const extendedRetirementAge = retirementInYears < 5 ? row.RetirementAge + 5 - retirementInYears : row.RetirementAge;
              return (
                row.Retired ? (
                  <div>
                    <span style={{ color: "#ff7777" }}>retired</span>
                    <br />
                    <a style={{ color: "lightblue" }} onClick={() => {
                      if (version === 2) {
                        database.exec(`UPDATE Staff_CommonData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${row.StaffID}`);
                      } else {
                        database.exec(`UPDATE Staff_GameData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${row.StaffID}`);
                      }
                      setUpdated(+new Date());
                    }}>unretire</a>
                  </div>
                ) : (
                  <div>
                    <span
                      style={{ color: retirementInYears > 0 ? "white" : "orange" }}
                    >{retirementInYears > 0 ? `in ${retirementInYears} years` : `${-retirementInYears} years ago`}</span>
                    <br />
                    {
                      retirementInYears < 5 && (
                        <a style={{ color: "lightblue" }} onClick={() => {
                          if (version === 2) {
                            database.exec(`UPDATE Staff_CommonData SET RetirementAge = RetirementAge + 5 - ${retirementInYears} WHERE StaffID = ${row.StaffID}`);
                          } else {
                            database.exec(`UPDATE Staff_GameData SET RetirementAge = RetirementAge + 5 - ${retirementInYears} WHERE StaffID = ${row.StaffID}`);
                          }
                          setUpdated(+new Date());
                        }}>postpone</a>
                      )
                    }
                  </div>
                )
              )
            }
          },
          {
            field: 'TeamID',
            headerName: 'Team',
            width: 200,
            valueGetter: ({ row }) => {
              if (row.TeamID <= 10) {
                return row.PosInTeam < 3 ? row.TeamID * 2 + row.PosInTeam : 50 + row.TeamID * 2
              }
              return row.TeamID ? 100 + row.TeamID * 3 + row.PosInTeam : 99999
            },
            renderCell: ({ row }) => {
              return row.TeamID ? (
                <div style={{color: `rgb(var(--team${row.TeamID}-triplet)`}}>
                  {teamNames(row.TeamID, metadata.version)}
                  <br />
                  <sub>Driver {row.PosInTeam}</sub>
                </div>
              ) : (
                "-"
              )
            }
          },
          {
            field: 'Salary',
            headerName: 'Contract',
            width: 150,
            renderCell: ({ row }) => {
              return row.TeamID ? (
                <div>
                  {formatter.format(row.Salary)}<br /><sub>until {row.EndSeason}</sub>
                </div>
              ) : (
                "Not contracted"
              )
            }
          },
          {
            field: 'ID',
            headerName: 'Edit',
            width: 200,
            renderCell: ({ row }) => {
              return (
                <div>
                  <a onClick={
                    () => setEditRow({...row})
                  }>edit driver</a><br />
                  {
                    row.TeamID && <a onClick={
                      () => setSwapRow({...row})
                    }>swap contracts</a>
                  }
                </div>
              )
            }
          },

        ]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 20 },
          },
        }}
        pageSizeOptions={[20, 50, 100]}
      />
    </div>
  );
}