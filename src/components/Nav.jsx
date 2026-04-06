import Customize from "@/components/Customize";
import Parts from "@/components/Parts";
import People from "@/components/People/Staff";
import Plugins from "@/components/Plugin/Plugins";
import Staff from "@/components/Staff/Staff";
import {BasicInfoContext, MetadataContext} from "@/js/Contexts";
import Facilities from "@/pages/facilities";
import Calendar from "@/pages/calendar";
import Expertise from "@/pages/expertise";
import Finance from "@/pages/finance";
import Modding from "@/pages/modding";
import RaceResults from "@/pages/race-results";
import Regulations from "@/pages/regulations";
import Results from "@/pages/results";
import Weekend from "@/pages/weekend";
import TeamTools from "@/pages/team-tools";
import Team from "@/pages/team";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BuildIcon from "@mui/icons-material/Build";
import ConstructionIcon from "@mui/icons-material/Construction";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EventIcon from "@mui/icons-material/Event";
import GroupIcon from "@mui/icons-material/Group";
import InsightsIcon from "@mui/icons-material/Insights";
import Groups2Icon from "@mui/icons-material/Groups2";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import TuneIcon from "@mui/icons-material/Tune";
import TodayIcon from "@mui/icons-material/Today";
import RuleIcon from "@mui/icons-material/Rule";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import {useContext, useMemo, useState} from "react";

const sections = [
  {
    label: "Race",
    items: [
      {name: "Weekend", icon: <EventIcon fontSize="small" />, tab: <Weekend />, showOnlyInWeekend: true},
    ],
  },
  {
    label: "Season",
    items: [
      {name: "Calendar", icon: <TodayIcon fontSize="small" />, tab: <Calendar />},
      {name: "Race Results", icon: <SportsScoreIcon fontSize="small" />, tab: <RaceResults />},
      {name: "Season Results", icon: <SportsScoreIcon fontSize="small" />, tab: <Results />},
      {name: "Regulations", icon: <RuleIcon fontSize="small" />, tab: <Regulations />},
    ],
  },
  {
    label: "Team",
    items: [
      {name: "Team", icon: <Groups2Icon fontSize="small" />, tab: <Team />},
      {name: "Logo", icon: <EditNoteIcon fontSize="small" />, tab: <Customize />, minVersion: "4.0"},
      {name: "Finance", icon: <PaymentsIcon fontSize="small" />, tab: <Finance />},
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
      {name: "Career", icon: <TuneIcon fontSize="small" />, tab: <TeamTools />},
      {name: "Modding", icon: <BuildIcon fontSize="small" />, tab: <Modding />},
      {name: "Plugins", icon: <AccountTreeIcon fontSize="small" />, tab: <Plugins />},
    ],
  },
];

export default function MainNav() {
  const basicInfo = useContext(BasicInfoContext);
  const {version, gameVersion} = useContext(MetadataContext);
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
  const current = visibleItems.find((item) => item.name === active) || visibleItems[0];

  return (
    <div className="grid gap-2 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border border-white/10 bg-white/[0.015]">
        {visibleSections.map((section, index) => (
          <div key={section.label} className={index === 0 ? "" : "border-t border-white/5"}>
            <div className="block px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {section.label}
            </div>
            <div className="pb-2">
              {section.items.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActive(item.name)}
                  className={`mx-2 mb-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded px-3 py-2 text-left transition ${
                    item.name === active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className={`flex w-[22px] shrink-0 items-center justify-center ${item.name === active ? "text-white" : "text-slate-400"}`}>
                    {item.icon}
                  </span>
                  <span className={`text-sm ${item.name === active ? "font-bold" : "font-medium"}`}>
                    {item.name}
                  </span>
                </button>
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
