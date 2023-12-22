import {resolveName, teamNames, dateToDay, dayToDate, getDriverCode} from "@/js/localization";
import {getCountryFlag, getCountryShort} from "@/js/localization/ISOCountries";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import {useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";
import {getStaff} from "./commons/drivers";
import {localeStaffStats, mailSenders} from "./commons/staffCommon";
import ContractSwapper from "./subcomponents/ContractSwapper";
import StaffEditor from "./subcomponents/StaffEditor";


export default function StaffGeneric({ StaffType = 1 }) {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const { enqueueSnackbar } = useSnackbar();

  const basicDataTable = version === 2 ? "Staff_CommonData" : "Staff_BasicData";
  const retirementDataTable = version === 2 ? "Staff_CommonData" : "Staff_GameData";


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
      <StaffEditor editRow={editRow} setEditRow={setEditRow} refresh={refresh} />
      <ContractSwapper swapRow={swapRow} setSwapRow={setSwapRow} refresh={refresh} />
      <DataGrid
        rows={rows}
        getRowId={r => r.StaffID}
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
              database.exec(`UPDATE Staff_Contracts SET Salary = ${newRow.Salary} WHERE StaffID = ${newRow.StaffID} AND ContractType = 0 AND Accepted = 1`);
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
              if (StaffType === 0) {
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
              } else {
                return (
                  <div style={{ fontSize: "90%" }}>
                    {
                      row.StaffID
                    }
                  </div>
                )
              }
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
          ...(StaffType < 5) ? ([
            {
              field: 'Overall' , headerName: "Overall",
              valueGetter: ({value}) => Number(value).toFixed(2),
              type: 'number',
              renderCell: ({value}) => {
                return (
                  <span style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                    {value}
                  </span>
                )
              }
            }]) : [],
          ...staffStats.map(x => (
            {
              field: 'performance_stats_' + x ,
              headerName: localeStaffStats["STAFF_STAT_" + x],
              flex: 1,
              editable: true,
              type: 'number',
              renderCell: ({value}) => {
                return (
                  <span style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                    {value}
                  </span>
                )
              },
            }
          )),
          ...StaffType === 0 ? ([
            {
              field: 'Improvability' , headerName: "Impr",
              flex: 1,
              editable: true,
              type: 'number',
              renderCell: ({value}) => {
                return (
                  <span style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
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
                  <span style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                    {value}
                  </span>
                )
              },
            },
          ]) : [],
          {
            field: 'DOB' , headerName: "DOB",
            width: 125,
            editable: true,
            valueGetter: ({ value }) => dayToDate(value),
            renderCell: ({ value, row }) => (
              <div>
                <span style={{fontSize: 12}}>{value.toISOString().split("T")[0]}</span>
                <br/>
                <span style={{fontSize: 12}}>Age {Math.floor(row.Age)}</span>
              </div>
            ),
            type: 'date',
          },
          ...StaffType === 5 ? ([
            {
              field: 'JobTitle',
              headerName: 'Position',
              flex: 1,
              renderCell: ({ value }) => {
                return mailSenders[value.replaceAll(/[\[\]]/g, '')];
              }
            },
          ]) : ([
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
                          <a style={{ color: "lightblue" }} onClick={() => {
                            database.exec(`UPDATE ${retirementDataTable} SET RetirementAge = RetirementAge + 5 - ${retirementInYears} WHERE StaffID = ${row.StaffID}`);
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
              field: 'Salary',
              headerName: 'Contract',
              width: 150,
              editable: true,
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
          ]),

          {
            field: 'TeamID',
            headerName: 'Team',
            width: 150,
            valueGetter: ({ row }) => {
              if (row.TeamID <= 10) {
                return row.PosInTeam < 3 ? row.TeamID * 2 + row.PosInTeam : 50 + row.TeamID * 2
              }
              return row.TeamID ? 100 + row.TeamID * 3 + row.PosInTeam : 99999
            },
            renderCell: ({ row }) => {
              return row.TeamID ? (
                <div style={{color: `rgb(var(--team${row.TeamID}-triplet)`}}>
                  {teamNames(row.TeamID, version)}
                  <br />
                  {
                    (StaffType === 0 || StaffType === 2) && (
                      <sub>Driver {row.PosInTeam}</sub>
                    )
                  }
                </div>
              ) : (
                "-"
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
                    row.TeamID && StaffType !== 5 && <a onClick={
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