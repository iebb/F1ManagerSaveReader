import Customize from "@/components/Customize";
import Parts from "@/components/Parts";
import People from "@/components/People/Staff";
import PitStop from "@/pages/pit-stop";
import Plugins from "@/components/Plugin/Plugins";
import Staff from "@/components/Staff/Staff";
import {BasicInfoContext, MetadataContext} from "@/js/Contexts";
import Board from "@/pages/board";
import Facilities from "@/pages/facilities";
import F1Results from "@/pages/f1-results";
import Calendar from "@/pages/calendar";
import Expertise from "@/pages/expertise";
import Finance from "@/pages/finance";
import Inbox from "@/pages/inbox";
import RaceResults from "@/pages/race-results";
import Regulations from "@/pages/regulations";
import RaceControl from "@/pages/race-control";
import Settings from "@/pages/settings";
import SqlEditor from "@/pages/sql-editor";
import Sporting from "@/pages/sporting";
import Sponsorship from "@/pages/sponsorship";
import TeamTools from "@/pages/team-tools";
import Team from "@/pages/team";
import WeekendSetup from "@/pages/weekend-setup";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ConstructionIcon from "@mui/icons-material/Construction";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EventIcon from "@mui/icons-material/Event";
import GroupIcon from "@mui/icons-material/Group";
import InsightsIcon from "@mui/icons-material/Insights";
import Groups2Icon from "@mui/icons-material/Groups2";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TuneIcon from "@mui/icons-material/Tune";
import TodayIcon from "@mui/icons-material/Today";
import RuleIcon from "@mui/icons-material/Rule";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import FlagIcon from "@mui/icons-material/Flag";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import ScienceIcon from "@mui/icons-material/Science";
import {IconButton, Tooltip, useMediaQuery} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {useContext, useEffect, useMemo, useState} from "react";
import Experimental from "@/pages/experimental";

const sections = [
  {
    label: "Race",
    items: [
      {name: "Weekend Setup", icon: <EventIcon fontSize="small" />, tab: <WeekendSetup />, showOnlyInWeekend: true},
      {name: "Race Control", icon: <FlagIcon fontSize="small" />, tab: <RaceControl />, showOnlyInWeekend: true, minVersion: "3.0"},
    ],
  },
  {
    label: "Season",
    items: [
      {name: "Calendar", icon: <TodayIcon fontSize="small" />, tab: <Calendar />},
      {name: "Results", icon: <SportsScoreIcon fontSize="small" />, tab: <F1Results />},
      {name: "Season Summary", icon: <SportsScoreIcon fontSize="small" />, tab: <RaceResults />},
      {name: "Regulations", icon: <RuleIcon fontSize="small" />, tab: <Regulations />},
      {name: "Pit Stop", icon: <FlagIcon fontSize="small" />, tab: <PitStop />},
      {name: "Sporting Audit", icon: <FlagIcon fontSize="small" />, tab: <Sporting />},
    ],
  },
  {
    label: "Team",
    items: [
      {name: "Contracts", icon: <Groups2Icon fontSize="small" />, tab: <Team />},
      {name: "Sponsorship", icon: <StorefrontIcon fontSize="small" />, tab: <Sponsorship />},
      {name: "Logo", icon: <EditNoteIcon fontSize="small" />, tab: <Customize />, minVersion: "4.0"},
      {name: "Finance", icon: <PaymentsIcon fontSize="small" />, tab: <Finance />},
      {name: "Board", icon: <InsightsIcon fontSize="small" />, tab: <Board />},
      {name: "Pit Crew", icon: <GroupIcon fontSize="small" />, tab: <Staff />},
      {name: "Facilities", icon: <ConstructionIcon fontSize="small" />, tab: <Facilities />},
      {name: "Parts", icon: <PrecisionManufacturingIcon fontSize="small" />, tab: <Parts />},
      {name: "Expertise", icon: <InsightsIcon fontSize="small" />, tab: <Expertise />},
    ],
  },
  {
    label: "People",
    items: [
      {name: "People", icon: <PeopleAltIcon fontSize="small" />, tab: <People />},
    ],
  },
  {
    label: "Tools",
    items: [
      {name: "Inbox", icon: <MailOutlineIcon fontSize="small" />, tab: <Inbox />},
      {name: "Tools", icon: <TuneIcon fontSize="small" />, tab: <TeamTools />},
      {name: "SQL Editor", icon: <TuneIcon fontSize="small" />, tab: <SqlEditor />},
      {name: "Experimental", icon: <ScienceIcon fontSize="small" />, tab: <Experimental />, minVersion: "4.0"},
      {name: "Settings", icon: <SettingsSuggestIcon fontSize="small" />, tab: <Settings />},
      {name: "Plugins", icon: <AccountTreeIcon fontSize="small" />, tab: <Plugins />},
    ],
  },
];

export default function MainNav() {
  const basicInfo = useContext(BasicInfoContext);
  const {version, gameVersion} = useContext(MetadataContext);
  const theme = useTheme();
  const compactByDefault = useMediaQuery(theme.breakpoints.down("md"));
  const cmp = require("semver-compare");
  const inRaceWeekend = (basicInfo?.weekend?.RaceID ?? -1) >= 0;

  const visibleSections = useMemo(() => sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.showOnlyInWeekend && !inRaceWeekend) {
        return false;
      }
      if (item.versions) {
        return item.versions.includes(version);
      }
      if (item.minVersion) {
        if (typeof item.minVersion === "number") {
          return version >= item.minVersion;
        }
        return cmp(`${version}.${gameVersion}`, item.minVersion) >= 0;
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0), [gameVersion, inRaceWeekend, version]);

  const visibleItems = visibleSections.flatMap((section) => section.items);
  const [active, setActive] = useState(visibleItems[0]?.name || "");
  const [navCollapsed, setNavCollapsed] = useState(compactByDefault);
  const current = visibleItems.find((item) => item.name === active) || visibleItems[0];

  useEffect(() => {
    setNavCollapsed(compactByDefault);
  }, [compactByDefault]);

  useEffect(() => {
    if (!visibleItems.some((item) => item.name === active)) {
      setActive(visibleItems[0]?.name || "");
    }
  }, [active, visibleItems]);

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `${navCollapsed ? 76 : 240}px minmax(0, 1fr)`,
      }}
    >
      <div className="border border-white/10 bg-white/[0.025] lg:sticky lg:top-4 lg:self-start">
        <div className={`flex items-center border-b border-white/5 ${navCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"}`}>
          {!navCollapsed ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Navigation</div>
              <div className="mt-1 text-sm font-semibold text-white">Workspace</div>
            </div>
          ) : null}
          <Tooltip title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton
              size="small"
              onClick={() => setNavCollapsed((currentState) => !currentState)}
              sx={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 0,
                color: "text.secondary",
              }}
            >
              {navCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </div>
        {visibleSections.map((section, index) => (
          <div key={section.label} className={index === 0 ? "" : "border-t border-white/5"}>
            {!navCollapsed ? (
              <div className="block px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {section.label}
              </div>
            ) : (
              <div className="px-2 pb-2 pt-3">
                <div className="mx-auto h-px w-8 bg-white/10" />
              </div>
            )}
            <div className="pb-2">
              {section.items.map((item) => (
                <Tooltip key={item.name} title={navCollapsed ? item.name : ""} placement="right">
                  <button
                    onClick={() => setActive(item.name)}
                    className={`mx-2 mb-1 flex items-center transition ${
                      navCollapsed
                        ? "w-[calc(100%-1rem)] justify-center px-2 py-2.5"
                        : "w-[calc(100%-1rem)] gap-3 px-3 py-2.5 text-left"
                    } ${
                      item.name === active
                        ? "border border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className={`flex w-[22px] shrink-0 items-center justify-center ${item.name === active ? "text-white" : "text-slate-400"}`}>
                      {item.icon}
                    </span>
                    {!navCollapsed ? (
                      <span className={`text-sm ${item.name === active ? "font-bold" : "font-medium"}`}>
                        {item.name}
                      </span>
                    ) : null}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="min-w-0">
        {current.tab}
      </div>
    </div>
  );
}
