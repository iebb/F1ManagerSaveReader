import * as React from "react";
import {useContext} from "react";
import {resolveLiteral, teamNames} from "@/js/localization";
import {BasicInfoContext, MetadataContext} from "@/js/Contexts";

export const TeamName = ({
                           TeamID = 0,
                           alpha=1,
                           type = 'text',
                           posInTeam = 0,
                           description = "",
                           header = "",
                         }) => {
  const {version, gameVersion} = useContext(MetadataContext);
  const {teamMap} = useContext(BasicInfoContext);
  if (!TeamID) return null;

  const teamName = TeamID > 31 ? resolveLiteral(teamMap[TeamID].TeamNameLocKey) : teamNames(TeamID, version);


  switch(type) {
    case "text":
      return (
        <span>{teamName}</span>
      )
    case "fanfare":
      return (
        <div style={{color: `rgba(var(--team${TeamID}-triplet), ${alpha})`}}>
          <div>
            {
              header ? header : (
                `${teamName}${posInTeam ? ` #${posInTeam}` : ""}`
              )
            }
          </div>
          <div>
            {
              description ? description : (
                <>
                  <div style={{
                    width: 12, height: 12, borderRadius: 6,
                    display: "inline-block", marginRight: 3,
                    background: `var(--team${TeamID}-fanfare1)`,
                    border: `1px solid var(--team${TeamID}-fanfare2)`,
                  }}/>
                  <div style={{
                    width: 12, height: 12, borderRadius: 6,
                    display: "inline-block", marginRight: 3,
                    background: `var(--team${TeamID}-fanfare2)`,
                    border: `1px solid var(--team${TeamID}-fanfare1)`,
                  }}/>
                </>
              )
            }
          </div>
        </div>
      )
    case "colored":
      return (
        <span style={{color: `rgb(var(--team${TeamID}-triplet)`}}>
          {teamName}
        </span>
      )
  }
}