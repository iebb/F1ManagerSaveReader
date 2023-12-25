import * as React from "react";
import {useContext} from "react";
import {teamNames} from "@/js/localization";
import {MetadataContext} from "@/js/Contexts";

export const TeamName = ({
                           TeamID = 0,
                           type = 'text'
                         }) => {
  const {version, gameVersion} = useContext(MetadataContext);
  if (!TeamID) return null;
  switch(type) {
    case "text":
      return (
        <span>{teamNames(TeamID, version)}</span>
      )
    case "fanfare":
      return (
        <div style={{color: `rgb(var(--team${TeamID}-triplet)`}}>
          <div>{teamNames(TeamID, version)}</div>
          <div>
            <div style={{
              width: 12, height: 12, borderRadius: 6,
              display: "inline-block", marginRight: 3,
              background: `var(--team${TeamID}-fanfare1)`,
            }}/>
            <div style={{
              width: 12, height: 12, borderRadius: 6,
              display: "inline-block", marginRight: 3,
              background: `var(--team${TeamID}-fanfare2)`,
            }}/>
          </div>
        </div>
      )
    case "colored":
      return (
        <span style={{color: `rgb(var(--team${value}-triplet)`}}>
          {teamNames(TeamID, version)}
        </span>
      )
  }
}