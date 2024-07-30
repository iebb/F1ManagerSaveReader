import {TeamName} from "@/components/Localization/Localization";
import {resolveName, teamNames, dateToDay, dayToDate, getDriverCode, resolveNameV4} from "@/js/localization";
import {getCountryFlag, getCountryShort} from "@/js/localization/ISOCountries";
import {Alert, AlertTitle} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {getStaff} from "./commons/drivers";
import {localeStaffStats, mailSenders} from "./commons/staffCommon";
import ContractSwapper from "./subcomponents/ContractSwapper";
import StaffEditor from "./subcomponents/StaffEditor";


export default function StaffDriver2024({ StaffType = 0 }) {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const { enqueueSnackbar } = useSnackbar();

  const basicDataTable = version === 2 ? "Staff_CommonData" : "Staff_BasicData";
  const retirementDataTable = version === 2 ? "Staff_CommonData" : "Staff_GameData";
  const { weekend, player } = basicInfo;


  const [rows, setRows] = useState([]);
  const [staffStats, setStaffStats] = useState([0, 1, 14, 15, 16, 17]);

  const [updated, setUpdated] = useState(0);
  const [editRow, setEditRow] = useState(null);
  const [swapRow, setSwapRow] = useState(null);

  const refresh = () => setUpdated(+new Date());


  useEffect(() => {
    try {
      const [StaffStats, results] = getStaff({basicInfo, database, version}, StaffType);
      setStaffStats(StaffStats);
      setRows(results);
    } catch (e) {
      console.error(e);
      enqueueSnackbar(
        `The database might be corrupt`,
        { variant: "error" }
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
      {
        (weekend.WeekendStage >= 8 && StaffType === 0) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Warning</AlertTitle>
            Swapping Drivers without Qualifying Results before a Race would result in a game crash.
          </Alert>
        )
      }
      <StaffEditor editRow={editRow} setEditRow={setEditRow} refresh={refresh} />
      <ContractSwapper swapRow={swapRow} setSwapRow={setSwapRow} refresh={refresh} />
      <DataGrid
        rows={rows}
        getRowId={r => r.StaffID}
        isCellEditable={({ row, field, value }) => {
          if (field === "Salary") {
            return value > 0;
          }
          return true;
        }}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const stat of staffStats) {
            if (newRow['performance_stats_' + stat] !== oldRow['performance_stats_' + stat]) {
              database.exec(`UPDATE Staff_PerformanceStats SET Val = ${
                newRow['performance_stats_' + stat]
              } WHERE StaffID = ${newRow.StaffID} AND StatID = ${stat}`);
            }
            if (StaffType === 0) {
              if (newRow.Improvability !== oldRow.Improvability) {
                database.exec(`UPDATE Staff_DriverData SET Improvability = ${newRow.Improvability} WHERE StaffID = ${newRow.StaffID}`);
              }
              if (newRow.Aggression !== oldRow.Aggression) {
                database.exec(`UPDATE Staff_DriverData SET Aggression = ${newRow.Aggression} WHERE StaffID = ${newRow.StaffID}`);
              }
            }
            if (newRow.RetirementAge !== oldRow.RetirementAge) {
              database.exec(`UPDATE ${retirementDataTable} SET RetirementAge = ${newRow.RetirementAge} WHERE StaffID = ${newRow.StaffID}`);
            }
            if (newRow.Salary !== oldRow.Salary && oldRow.Salary > 0) {
              database.exec(`UPDATE Staff_Contracts SET Salary = ${newRow.Salary} WHERE StaffID = ${newRow.StaffID} AND ContractType = 0`);
            }
            if (newRow.DOB !== oldRow.DOB) {
              const _DOB_Date = typeof newRow.DOB === 'object' ? newRow.DOB : dayToDate(newRow.DOB);
              const _DOB_DayValue = dateToDay(+_DOB_Date);
              const _DOB_ISO = _DOB_Date.toISOString().split("T")[0];
              database.exec(`UPDATE ${basicDataTable} SET DOB = ${_DOB_DayValue}, DOB_ISO = ${_DOB_ISO} WHERE StaffID = ${newRow.StaffID}`);
              newRow.DOB = _DOB_DayValue;
            }
          }
          refresh();
          return newRow;
        }}
        columns={[
          {
            field: 'ID',
            headerName: '#',
            valueGetter: ({ row }) => row.StaffID,
            width: 40,
            renderCell: ({ row }) => {
              return (
                <div style={{fontSize: "90%"}}>
                  {
                    row.CurrentNumber
                  }
                  <br/>
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
                <img src={getCountryFlag(row.Nationality)} className="w-6 inline-block" />
              )
            }
          },
          {
            field: 'StaffID',
            headerName: 'Name',
            width: 100,
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
          {
            field: 'Overall' , headerName: "Overall",
            valueGetter: ({value}) => Number(value).toFixed(2),
            type: 'number',
            renderCell: ({value}) => {
              return (
                <span style={{textAlign: "right", padding: 6}}>
                    {value}
                  </span>
              )
            }
          },
          ...staffStats.map(x => (
            {
              field: 'performance_stats_' + x ,
              headerName: localeStaffStats["STAFF_STAT_" + x],
              flex: 1,
              editable: true,
              type: 'number',
              renderCell: ({value}) => {
                return (
                  <span style={{textAlign: "right", padding: 6}}>
                    {value}
                  </span>
                )
              },
            }
          )),
          {
            field: 'Improvability' , headerName: "Impr",
            flex: 1,
            editable: true,
            type: 'number',
            renderCell: ({value}) => {
              return (
                <span style={{textAlign: "right", padding: 6}}>
                  {value}
                </span>
              )
            },
          },
          {
            field: 'Aggression' , headerName: "Aggr",
            flex: 1,
            editable: true,
            type: 'number',
            renderCell: ({value}) => {
              return (
                <span style={{textAlign: "right", padding: 6}}>
                  {value}
                </span>
              )
            },
          },
          {
            field: 'DOB' , headerName: "DOB",
            width: 100,
            editable: true,
            type: 'date',
            valueGetter: ({ value }) => dayToDate(value),
            renderCell: ({ value, row }) => (
              <div>
                <span style={{fontSize: 12}}>{value.toISOString().split("T")[0]}</span>
                <br/>
                <span style={{fontSize: 12}}>Age {Math.floor(row.Age)}</span>
              </div>
            ),
          },
          {
            field: 'RetirementAge',
            headerName: 'Retire',
            width: 100,
            editable: true,
            renderCell: ({ row }) => {
              const retirementInYears = Math.ceil(row.RetirementAge - row.Age);
              const extendedRetirementAge = retirementInYears < 5 ? row.RetirementAge + 5 - retirementInYears : row.RetirementAge;
              return (
                row.Retired ? (
                  <div>
                    <span style={{ color: "#ff7777" }}>retired</span>
                    <br />
                    <a style={{ color: "lightblue" }} onClick={() => {
                      database.exec(`UPDATE ${retirementDataTable} SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${row.StaffID}`);
                      setUpdated(+new Date());
                    }}>unretire</a>
                  </div>
                ) : (
                  <div>
                    <span
                      style={{ color: retirementInYears > 0 ? "white" : "orange" }}
                    >{retirementInYears > 0 ? `in ${retirementInYears}y` : `${-retirementInYears}y ago`}</span>
                    <br />
                    {
                      retirementInYears < 5 && (
                        <span className="small" style={{ color: "lightblue" }} onClick={() => {
                          database.exec(`UPDATE ${retirementDataTable} SET RetirementAge = RetirementAge + 5 - ${retirementInYears} WHERE StaffID = ${row.StaffID}`);
                          setUpdated(+new Date());
                        }}>postpone</span>
                      )
                    }
                  </div>
                )
              )
            }
          },
          {
            field: 'Contracts.0.Salary',
            headerName: 'Contract',
            width: 150,
            editable: true,
            renderCell: ({ row }) => {
              if (!row.Contracts.length) {
                return "Not contracted";
              }
              const Contract = row.Contracts[0];
              return (
                <div>
                  {formatter.format(Contract.Salary)}
                  <br />
                  <span>
                    <span className="small" >until {Contract.EndSeason} <a style={{color: "lightblue"}} onClick={() => {
                      database.exec(`UPDATE Staff_Contracts SET EndSeason = EndSeason + 1 WHERE StaffID = ${row.StaffID} AND ContractType = 0 ${version <= 3 ? 'AND Accepted = 1' : ''}`);
                      setUpdated(+new Date());
                    }}>+1</a> {
                      Contract.EndSeason > player.CurrentSeason ? (
                        <a style={{color: "lightblue"}} onClick={() => {
                          database.exec(`UPDATE Staff_Contracts SET EndSeason = EndSeason - 1 WHERE StaffID = ${row.StaffID} AND ContractType = 0 ${version <= 3 ? 'AND Accepted = 1' : ''}`);
                          setUpdated(+new Date());
                        }}>-1</a>
                      ) : null
                    }</span>
                    </span>
                </div>
              )
            }
          },
          {
            field: 'TeamID',
            headerName: 'Team',
            width: 175,
            valueGetter: ({row}) => {
              return row.TeamID ? row.TeamFormula * 100 + row.TeamID * 3 + row.PosInTeam : 99999
            },
            renderCell: ({ row }) => {
              return row.TeamID ? (
                <TeamName
                  type="fanfare"
                  TeamID={row.TeamID}
                  description={
                   <div className="small flex gap-1">
                     {
                       row.TeamFormula <= 3 ? (
                         <span className="small">Driver #{row.PosInTeam}</span>
                       ) : (
                         <span className="small">Reserve</span>
                       )
                     }
                     {
                       row.Contracts.length > 1 && (
                         <div className="small">
                           {row.Contracts.slice(1).map(c => <TeamName type="colored" key={c.TeamID} TeamID={c.TeamID} />)}
                         </div>
                       )
                     }
                   </div>
                  }
                />
              ) : (
                row.PreviousTeamID ? (
                  <div style={{color: `rgba(var(--team${row.PreviousTeamID}-triplet), 0.5)`}}>
                    <span className="small">Previous ({dayToDate(row.PreviousContractED - 1).getFullYear()}):</span>
                    <br/>
                    <span className="small">
                      {teamNames(row.PreviousTeamID, version)}
                    </span>
                  </div>
                ) : (
                  "-"
                )
              )
            }
          },
          {
            field: '_',
            headerName: 'Edit',
            width: 200,
            renderCell: ({ row }) => {
              return (
                <div>
                  <a onClick={
                    () => setEditRow({...row})
                  }>edit staff</a><br />
                  {
                    StaffType !== 5 && <a onClick={
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