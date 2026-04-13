import {resolveLiteral, teamNames} from "@/js/localization";

export function getTeamDisplayName(teamMap, teamId, version) {
  if (teamId > 31 && teamMap?.[teamId]?.TeamNameLocKey) {
    return resolveLiteral(teamMap[teamId].TeamNameLocKey);
  }
  return teamNames(teamId, version);
}
