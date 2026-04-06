import CompatibilityPreview from "@/components/Customize/CompatibilityPreview";
import { TestStringCompatibility } from "@/components/Customize/Player/font_glyphs";
import { BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext } from "@/js/Contexts";
import { resolveLiteral } from "@/js/localization";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useMemo, useState } from "react";

const LANGUAGE_LABELS = {
  Chn: "Chinese (Simplified)",
  Jpn: "Japanese",
  Lat: "Latin languages",
  Rus: "Russian",
};

function getSupportedLanguages(compatibility) {
  return Object.entries(LANGUAGE_LABELS)
    .filter(([key]) => compatibility[key])
    .map(([, label]) => label);
}

function getCompatibilityMeta(compatibility) {
  if (compatibility.All) {
    return {
      eyebrow: "Fully compatible",
      summary: "Renders correctly in every supported language set.",
      tone: "border-emerald-400/20 bg-emerald-500/8",
      eyebrowTone: "text-emerald-300/80",
    };
  }

  if (compatibility.None) {
    return {
      eyebrow: "Unsupported",
      summary: "Some glyphs are missing everywhere and should be replaced.",
      tone: "border-rose-400/20 bg-rose-500/8",
      eyebrowTone: "text-rose-300/80",
    };
  }

  const supportedLanguages = getSupportedLanguages(compatibility);
  return {
    eyebrow: "Partial coverage",
    summary: `Supported in ${supportedLanguages.join(", ")}.`,
    tone: "border-sky-400/20 bg-sky-500/8",
    eyebrowTone: "text-sky-300/80",
  };
}

function RenameCard({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="border border-white/10 bg-white/[0.015]">
      <div className="border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{eyebrow}</div>
          <h3 className="mt-2 text-base font-bold text-white">{title}</h3>
          <p className="mt-1 max-w-[560px] text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 px-5 py-5">{children}</div>
    </section>
  );
}

function CompatibilityPanel({ compatibility }) {
  const meta = getCompatibilityMeta(compatibility);

  return (
    <div className={`border px-4 py-4 ${meta.tone}`}>
      <div className={`text-[11px] uppercase tracking-[0.14em] ${meta.eyebrowTone}`}>{meta.eyebrow}</div>
      <p className="mt-2 text-sm text-slate-200">{meta.summary}</p>
      <div className="mt-4">
        <CompatibilityPreview compatibility={compatibility} />
      </div>
    </div>
  );
}

export default function Rename() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();

  const currentTeamLiteral = basicInfo.teamMap[basicInfo.player.TeamID].TeamNameLocKey;
  const currentTeamName = resolveLiteral(currentTeamLiteral);
  const hasCustomTeam = basicInfo.player.TeamID >= 32;

  const [firstName, setFirstName] = useState(basicInfo.player.FirstName);
  const [lastName, setLastName] = useState(basicInfo.player.LastName);
  const [teamName, setTeamName] = useState(currentTeamName);

  const playerCompatibility = useMemo(() => TestStringCompatibility(firstName, lastName), [firstName, lastName]);
  const teamCompatibility = useMemo(() => TestStringCompatibility(teamName), [teamName]);

  const playerChanged = firstName !== basicInfo.player.FirstName || lastName !== basicInfo.player.LastName;
  const teamChanged = `[STRING_LITERAL:Value=|${teamName}|]` !== basicInfo.player.Team;

  const savePlayer = () => {
    database.exec(`UPDATE Player SET FirstName = :firstName, LastName = :lastName`, {
      ":firstName": firstName,
      ":lastName": lastName,
    });

    const metaProperty = metadata.gvasMeta.Properties.Properties.find((property) => property.Name === "MetaData");
    metaProperty.Properties[0].Properties.forEach((property) => {
      if (property.Name === "FirstName") property.Property = firstName;
      if (property.Name === "LastName") property.Property = lastName;
    });

    basicInfoUpdater({ metadata });
    enqueueSnackbar("Player name updated", { variant: "success" });
  };

  const saveTeam = () => {
    database.exec(`UPDATE Teams SET TeamNameLocKey = :teamName WHERE TeamID = :teamID`, {
      ":teamName": `[STRING_LITERAL:Value=|${teamName}|]`,
      ":teamID": basicInfo.player.TeamID,
    });

    const metaProperty = metadata.gvasMeta.Properties.Properties.find((property) => property.Name === "MetaData");
    metaProperty.Properties[0].Properties.forEach((property) => {
      if (property.Name === "Team") property.Property = `[STRING_LITERAL:Value=|${teamName}|]`;
    });

    basicInfoUpdater({ metadata });
    enqueueSnackbar("Team name updated", { variant: "success" });
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RenameCard
          eyebrow="Player Identity"
          title="Rename Player"
          description="Adjust the manager name shown throughout the save."
        >
          <div className="border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Current Name</div>
            <div className="mt-1 text-sm font-semibold text-white">{`${basicInfo.player.FirstName} ${basicInfo.player.LastName}`}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">First Name</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Last Name</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
              />
            </label>
            <button
              type="button"
              onClick={savePlayer}
              disabled={!playerChanged}
              className="h-[42px] border border-amber-300/30 bg-amber-500/15 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-default disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <CompatibilityPanel compatibility={playerCompatibility} />
        </RenameCard>

        <RenameCard
          eyebrow="Team Identity"
          title="Rename Team"
          description={hasCustomTeam
            ? "Update the custom team name stored in save metadata and the in-game UI."
            : "Team renaming is only available while managing a custom team save."}
        >
          <div className="border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Current Team Name</div>
            <div className="mt-1 text-sm font-semibold text-white">{currentTeamName}</div>
          </div>

          {hasCustomTeam ? (
            <>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="grid gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Team Name</span>
                  <input
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    className="border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveTeam}
                  disabled={!teamChanged}
                  className="h-[42px] border border-amber-300/30 bg-amber-500/15 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-default disabled:opacity-50"
                >
                  Save
                </button>
              </div>

              <CompatibilityPanel compatibility={teamCompatibility} />
            </>
          ) : (
            <div className="border border-white/10 bg-black/10 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Unavailable</div>
              <p className="mt-2 text-sm text-slate-300">
                Switch to a custom team career if you need to edit the team name from this workspace.
              </p>
            </div>
          )}
        </RenameCard>
      </div>
    </div>
  );
}
