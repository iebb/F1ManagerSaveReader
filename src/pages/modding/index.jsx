import * as React from "react";
import ReplaceDB from "../../components/Modding/ReplaceDB";
import DataBrowser from "../../components/Modding/SQL";
import {VTabs} from "../../components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ]} />
  );
}
