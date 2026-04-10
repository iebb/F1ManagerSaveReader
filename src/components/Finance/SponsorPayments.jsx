import {currencyFormatter} from "@/components/Finance/utils";
import { getExistingTableSet } from "@/components/Customize/Player/timeMachineUtils";
import {
  Grid,
  Input,
  Slider,
} from "@mui/material";
import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import TeamIdentity from "@/components/Common/TeamIdentity";

function formatOrdinal(value) {
  return `${value}${{
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
  }[new Intl.PluralRules("en", {type: "ordinal"}).select(value)]}`;
}

export default function SponsorPayments() {
  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext);
  const {player, currentSeasonRaces} = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());
  const existingTables = useMemo(() => getExistingTableSet(database), [database]);

  const [prestiges, setPrestiges] = useState([]);
  const [sponsorshipValues, setSponsorshipValues] = useState([]);
  const [packageDrafts, setPackageDrafts] = useState({});
  const [editingPackageTeamId, setEditingPackageTeamId] = useState(null);

  const hasSponsorPaymentTables = existingTables.has("Sponsorship_Values")
    && existingTables.has("Sponsorship_Constants")
    && existingTables.has("Sponsorship_ContractObligations")
    && existingTables.has("Sponsorship_Enum_Obligations")
    && (existingTables.has("Board_Prestige") || existingTables.has("Board_TeamRating"));

  const season = player.CurrentSeason;
  const races = {
    2: 22,
    3: 23,
  }[version] || currentSeasonRaces.length || 24;

  useEffect(() => {
    if (!hasSponsorPaymentTables) {
      setSponsorshipValues([]);
      setPrestiges([]);
      return;
    }

    const sponsorValues = database.getAllRows(`SELECT * FROM Sponsorship_Values ORDER BY "StandingPosition" ASC`);
    setSponsorshipValues(sponsorValues);

    const sponsorConsts = database.getAllRows(`SELECT * FROM Sponsorship_Constants`)[0];
    const { LumpSumPercentage, MerchandiseCostRatio } = sponsorConsts;

    const prestigeRows = database.getAllRows(
      `${existingTables.has("Board_Prestige")
        ? `SELECT Board_Prestige.TeamID, PtsFromConstructorResults + PtsFromDriverResults + PtsFromSeasonsEntered + PtsFromChampionshipsWon AS Prestige,
                 PtsFromConstructorResults, PtsFromDriverResults, PtsFromSeasonsEntered, PtsFromChampionshipsWon,
                 ObligationReward, MerchandiseNum, MerchReward
           FROM Board_Prestige LEFT JOIN (
                 SELECT TeamID, SUM(Quantity * UnitReward) as ObligationReward
                 FROM Sponsorship_ContractObligations LEFT JOIN Sponsorship_Enum_Obligations
                 ON Sponsorship_ContractObligations.ObligationID = Sponsorship_Enum_Obligations.ObligationID
                 WHERE Accepted = 1 AND Sponsorship_ContractObligations.ObligationID != 7 GROUP BY TeamID ORDER BY TeamID ASC
              ) ob1 ON ob1.TeamID = Board_Prestige.TeamID
           LEFT JOIN (
                 SELECT TeamID, SUM(Quantity * UnitReward) as MerchReward, SUM(Quantity) as MerchandiseNum
                 FROM Sponsorship_ContractObligations LEFT JOIN Sponsorship_Enum_Obligations
                 ON Sponsorship_ContractObligations.ObligationID = Sponsorship_Enum_Obligations.ObligationID
                 WHERE Accepted = 1 AND Sponsorship_ContractObligations.ObligationID = 7 GROUP BY TeamID ORDER BY TeamID ASC
              ) ob2 ON ob2.TeamID = Board_Prestige.TeamID
           WHERE ( SeasonID = ${season - 1} ) ORDER BY Prestige DESC`
        : `SELECT Board_TeamRating.TeamID,
                  PtsFromNewTeamHype + PtsFromDriverResults + PtsFromConstructorResults + PtsFromChampionshipsWon + PtsFromSeasonsEntered AS Prestige,
                  PtsFromConstructorResults, PtsFromDriverResults, PtsFromSeasonsEntered, PtsFromChampionshipsWon,
                  ObligationReward, MerchandiseNum, MerchReward
           FROM Board_TeamRating LEFT JOIN (
                 SELECT TeamID, SUM(Quantity * UnitReward) as ObligationReward
                 FROM Sponsorship_ContractObligations LEFT JOIN Sponsorship_Enum_Obligations
                 ON Sponsorship_ContractObligations.ObligationID = Sponsorship_Enum_Obligations.ObligationID
                 WHERE Accepted = 1 AND Sponsorship_ContractObligations.ObligationID != 7 GROUP BY TeamID ORDER BY TeamID ASC
              ) ob1 ON ob1.TeamID = Board_TeamRating.TeamID
           LEFT JOIN (
                 SELECT TeamID, SUM(Quantity * UnitReward) as MerchReward, SUM(Quantity) as MerchandiseNum
                 FROM Sponsorship_ContractObligations LEFT JOIN Sponsorship_Enum_Obligations
                 ON Sponsorship_ContractObligations.ObligationID = Sponsorship_Enum_Obligations.ObligationID
                 WHERE Accepted = 1 AND Sponsorship_ContractObligations.ObligationID = 7 GROUP BY TeamID ORDER BY TeamID ASC
              ) ob2 ON ob2.TeamID = Board_TeamRating.TeamID
           WHERE ( SeasonID = ${season - 1} ) ORDER BY Prestige DESC`}`
    ).map((row, index) => {
      const sponsorPackage = sponsorValues[index].SponsorValue;
      const lumpSum = sponsorPackage * LumpSumPercentage * 0.01;
      const merchandiseCost = (row.MerchReward || 0) * (
        sponsorValues[index].SponsorValue / sponsorValues[0].SponsorValue
      ) * MerchandiseCostRatio;
      const packagePerRace = Math.floor((sponsorPackage - lumpSum) / races);
      const merchandisePerRace = Math.floor(merchandiseCost * 1.5 / races);
      const lumpSumRounded = lumpSum + ((sponsorPackage - lumpSum) - packagePerRace * races) + (merchandiseCost * 1.5 - merchandisePerRace * races);

      return {
        ...row,
        Rank: index + 1,
        SponsorPackage: sponsorPackage,
        ObligationReward: (row.ObligationReward || 0) * sponsorValues[index].SponsorValue / sponsorValues[0].SponsorValue,
        LumpSum: lumpSumRounded,
        LumpSumAdjusted: lumpSumRounded - merchandiseCost,
        Merchandise: merchandiseCost * 0.5,
        MerchandiseCost: merchandiseCost,
        PackagePR: packagePerRace,
        MerchandisePR: merchandisePerRace,
        TotalPR: packagePerRace + merchandiseCost * 1.5 / races,
      };
    });

    setPrestiges(prestigeRows);
  }, [database, existingTables, hasSponsorPaymentTables, races, season, updated]);

  useEffect(() => {
    setPackageDrafts(
      Object.fromEntries(
        prestiges.map((row) => [row.TeamID, String(row.SponsorPackage ?? "")])
      )
    );
    setEditingPackageTeamId(null);
  }, [prestiges]);

  const setSponsorshipValueBySlider = (initialValue, targetGap) => {
    database.exec(
      `UPDATE Sponsorship_Values SET SponsorValue = ROUND((:initialValue - (StandingPosition - 1) * :targetGap) / 10000, 0) * 10000`,
      {
        ":initialValue": initialValue,
        ":targetGap": targetGap,
      }
    );
  };

  const updateStandingPackage = (standingPosition, sponsorPackage) => {
    database.exec(
      `UPDATE Sponsorship_Values SET SponsorValue = :sponsorPackage WHERE StandingPosition = :standingPosition`,
      {
        ":standingPosition": standingPosition,
        ":sponsorPackage": sponsorPackage,
      }
    );
    refresh();
  };

  const commitPackageDraft = (row) => {
    const rawValue = packageDrafts[row.TeamID];
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setPackageDrafts((current) => ({
        ...current,
        [row.TeamID]: String(row.SponsorPackage),
      }));
      setEditingPackageTeamId(null);
      return;
    }
    if (parsedValue !== row.SponsorPackage) {
      updateStandingPackage(row.Rank, parsedValue);
      setEditingPackageTeamId(null);
      return;
    }
    setPackageDrafts((current) => ({
      ...current,
      [row.TeamID]: String(row.SponsorPackage),
    }));
    setEditingPackageTeamId(null);
  };

  if (!hasSponsorPaymentTables || !sponsorshipValues.length) {
    return null;
  }

  const initialValue = sponsorshipValues[0].SponsorValue;
  const paymentGap = Math.round((sponsorshipValues[0].SponsorValue - sponsorshipValues[9].SponsorValue) / 9);
  const minSponsorValueFor1st = 5000000;
  const maxSponsorValueFor1st = 200000000;
  const maxGap = 10000000;
  const minGap = -10000000;
  const playerRow = prestiges.find((row) => Number(row.TeamID) === Number(player.TeamID)) || null;

  return (
    <div className="grid gap-2.5">
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Finance Workspace</div>
            <h2 className="mt-1.5 text-base font-bold text-white">Sponsor Payments</h2>
            <p className="mt-1.5 max-w-[860px] text-[13px] text-slate-400">
              Tune the season-wide sponsor payout ladder, then review how prestige, obligations, merchandise, and per-race income land across the grid.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:min-w-[400px]">
            <div className="border border-white/10 bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Package For 1st</div>
              <div className="mt-1.5 text-lg font-bold text-white">{currencyFormatter.format(initialValue)}</div>
            </div>
            <div className="border border-white/10 bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Player-Team Per Race</div>
              <div className="mt-1.5 text-lg font-bold text-white">{currencyFormatter.format(playerRow?.TotalPR || 0)}</div>
            </div>
          </div>
        </div>
      </section>

      {currentSeasonRaces.length !== races ? (
        <section className="border border-amber-300/20 bg-amber-500/[0.08] px-4 py-3 text-[13px] text-amber-100">
          Per-race income stays tied to the base calendar length of {races} races. Extra calendar rounds will add effective funding.
        </section>
      ) : null}

      <section className="grid gap-2.5 xl:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.015] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Payout Curve</div>
          <div className="mt-1 text-sm font-bold text-white">Sponsor package for 1st</div>
          <div className="mt-2.5">
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Input
                  value={initialValue}
                  size="small"
                  style={{width: 148}}
                  onChange={(event) => {
                    setSponsorshipValueBySlider(Number(event.target.value), paymentGap);
                    refresh();
                  }}
                  inputProps={{
                    step: 1000000,
                    min: 0,
                    type: "number",
                    style: {textAlign: "right"},
                    "aria-labelledby": "sponsor-payment-initial",
                  }}
                />
              </Grid>
              <Grid item xs>
                <Slider
                  value={initialValue}
                  step={1000000}
                  min={minSponsorValueFor1st}
                  max={maxSponsorValueFor1st}
                  onChange={(event, newValue) => {
                    setSponsorshipValueBySlider(Number(newValue), paymentGap);
                    refresh();
                  }}
                  aria-labelledby="sponsor-payment-initial"
                />
              </Grid>
            </Grid>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Sets the top end of the sponsor ladder before prestige-based ranking is applied.
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.015] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Position Drop-Off</div>
          <div className="mt-1 text-sm font-bold text-white">Deduction per extra position</div>
          <div className="mt-2.5">
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Input
                  value={paymentGap}
                  size="small"
                  style={{width: 148}}
                  onChange={(event) => {
                    setSponsorshipValueBySlider(initialValue, Number(event.target.value));
                    refresh();
                  }}
                  inputProps={{
                    step: 1000000,
                    type: "number",
                    style: {textAlign: "right"},
                    "aria-labelledby": "sponsor-payment-gap",
                  }}
                />
              </Grid>
              <Grid item xs>
                <Slider
                  value={paymentGap}
                  step={1000000 / 3}
                  min={minGap}
                  max={maxGap}
                  onChange={(event, newValue) => {
                    setSponsorshipValueBySlider(initialValue, Number(newValue));
                    refresh();
                  }}
                  aria-labelledby="sponsor-payment-gap"
                />
              </Grid>
            </Grid>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Controls how sharply sponsor packages fall from P1 to P10.
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="min-w-0 overflow-x-auto bg-black/10 p-1.5">
          <div className="min-w-[1060px]">
            <div className="grid grid-cols-[190px_90px_150px_135px_135px_150px_130px_130px_130px] border border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <div className="border-r border-white/10 px-3 py-2.5">Team</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">{`Prestige ${season - 1}`}</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">Sponsor Package</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">Lump Sum</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">Obligations</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">Merch Income</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">Sponsor/Race</div>
              <div className="border-r border-white/10 px-3 py-2.5 text-right">Merch/Race</div>
              <div className="px-3 py-2.5 text-right">Total/Race</div>
            </div>
            {prestiges.map((row, index) => (
              <div
                key={row.TeamID}
                className={`grid grid-cols-[190px_90px_150px_135px_135px_150px_130px_130px_130px] border-x border-b border-white/10 ${index % 2 === 0 ? "bg-white/[0.012]" : "bg-transparent"}`}
              >
                <div className="flex items-center border-r border-white/10 px-3 py-2.5">
                  <TeamIdentity TeamID={row.TeamID} size="sm" textClassName="text-[13px]" />
                </div>
                <div className="flex items-center justify-end border-r border-white/10 px-3 py-2.5 text-right">
                  <div className="grid gap-1">
                    <span className="text-[13px] font-semibold text-white">{row.Prestige}</span>
                    <span className="text-[11px] text-slate-500">{formatOrdinal(row.Rank)}</span>
                  </div>
                </div>
                <div className="border-r border-white/10 px-3 py-2.5">
                  <div className="grid gap-1 justify-items-end">
                    {editingPackageTeamId === row.TeamID ? (
                      <input
                        type="number"
                        autoFocus
                        className="w-full bg-transparent px-0 py-1 text-right text-[13px] font-semibold text-white outline-none"
                        value={packageDrafts[row.TeamID] ?? ""}
                        step={10000}
                        min={0}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setPackageDrafts((current) => ({
                            ...current,
                            [row.TeamID]: nextValue,
                          }));
                        }}
                        onBlur={() => commitPackageDraft(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            setPackageDrafts((current) => ({
                              ...current,
                              [row.TeamID]: String(row.SponsorPackage),
                            }));
                            setEditingPackageTeamId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full bg-transparent px-0 py-1 text-right text-[13px] font-semibold text-white"
                        onClick={() => setEditingPackageTeamId(row.TeamID)}
                      >
                        {currencyFormatter.format(row.SponsorPackage)}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end border-r border-white/10 px-3 py-2.5 text-right text-[13px] font-semibold text-white">
                  {currencyFormatter.format(row.LumpSumAdjusted)}
                </div>
                <div className="flex items-center justify-end border-r border-white/10 px-3 py-2.5 text-right text-[13px] font-semibold text-white">
                  {currencyFormatter.format(row.ObligationReward || 0)}
                </div>
                <div className="flex items-center justify-end border-r border-white/10 px-3 py-2.5 text-right">
                  <div className="grid gap-1">
                    <span className="text-[13px] font-semibold text-white">{currencyFormatter.format(row.Merchandise || 0)}</span>
                    <span className="text-[11px] text-slate-500">{`x${row.MerchandiseNum || 0} / -${currencyFormatter.format(row.MerchandiseCost || 0)}`}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end border-r border-white/10 px-3 py-2.5 text-right text-[13px] font-semibold text-white">
                  {currencyFormatter.format(row.PackagePR || 0)}
                </div>
                <div className="flex items-center justify-end border-r border-white/10 px-3 py-2.5 text-right text-[13px] font-semibold text-white">
                  {currencyFormatter.format(row.MerchandisePR || 0)}
                </div>
                <div className="flex items-center justify-end px-3 py-2.5 text-right text-[13px] font-semibold text-white">
                  {currencyFormatter.format(row.TotalPR || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
