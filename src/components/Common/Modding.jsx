import {Button, Container, Divider, Typography} from "@mui/material";
import {useContext} from "react";
import * as React from "react";
import Dropzone from "react-dropzone";
import {dump, repack} from "../../js/fileAnalyzer";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../Contexts";
import DataView from "../DataView";
import ContractView from "../Modding/Contracts";
import ReplaceDB from "../Modding/ReplaceDB";
import DriverView from "../Modding/Drivers";
import DataBrowser from "../Modding/SQL";
import Toolbox from "../Modding/Toolbox";
import {VTabs} from "../Tabs";


export default function Modding() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  let opt = [];

  if (version === 3) {
    opt = [
      {name: "Driver Database", tab: <DriverView />},
      // {name: "Contracts", tab: <ContractView database={database} metadata={metadata} basicInfo={basicInfo} />},
      {name: "Tools / Cheats", tab: <Toolbox database={database} metadata={metadata} basicInfo={basicInfo} />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  } else {
    opt = [
      {name: "Driver Database", tab: <DriverView />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  }


  return (
    <div>
      <Typography variant="h5" component="h5">
        Database Modding
      </Typography>
      <Typography variant="p" component="p" sx={{ color: "orange" }}>
        Use at your own risk. Always make a backup before changing anything.
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Button color="warning" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata)}>Re-export Savefile</Button>
      <Button variant="contained" sx={{ mr: 2 }} onClick={() => dump(database, metadata)}>Dump Database</Button>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <VTabs options={opt} />

    </div>
  );
}