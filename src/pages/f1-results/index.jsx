import RaceResultsF2 from "@/components/RaceResults/RaceResultsF2";
import RaceResultsF1 from "@/components/RaceResults/RaceResultsF1";
import {MetadataContext} from "@/js/Contexts";
import {useContext, useMemo, useState} from "react";

export default function Page() {
  const {version, gameVersion} = useContext(MetadataContext);
  const cmp = require("semver-compare");
  const seriesOptions = useMemo(() => {
    const options = [{ value: 1, label: "Formula 1" }];
    if (cmp(`${version}.${gameVersion}`, "3.0") >= 0) {
      options.push({ value: 2, label: "Formula 2" });
      options.push({ value: 3, label: "Formula 3" });
    }
    return options;
  }, [gameVersion, version]);
  const [activeSeries, setActiveSeries] = useState(seriesOptions[0]?.value || 1);

  if (activeSeries === 2) {
    return <RaceResultsF2 formulae={2} activeSeries={activeSeries} onSeriesChange={setActiveSeries} seriesOptions={seriesOptions} />;
  }
  if (activeSeries === 3) {
    return <RaceResultsF2 formulae={3} activeSeries={activeSeries} onSeriesChange={setActiveSeries} seriesOptions={seriesOptions} />;
  }
  return <RaceResultsF1 activeSeries={activeSeries} onSeriesChange={setActiveSeries} seriesOptions={seriesOptions} />;
}
