import * as React from "react";
import {useContext} from "react";
import * as material from "@mui/material";
import {Slider, TextField} from "@mui/material";
import {DatabaseContext, MetadataContext} from "@/js/Contexts";

export default function PluginDev() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const version = useContext(MetadataContext);

  const exposed =  {
    db: {
      query: sql => database.getAllRows(sql),
      exec: sql => database.exec(sql),
    },
    metadata: {
      // get:
    },
    version,
    material,
  }


  const { db } = exposed;

  const { Button, Divider, FormControl,
    FormControlLabel, FormLabel, Radio, RadioGroup, Slider, TextField,
    Typography } = material;
  const [opt, setOpt] = React.useState('ALL');
  const [log, setLog] = React.useState('');
  const [difficulty, setDifficulty] = React.useState(0);
  const [intensity, setIntensity] = React.useState(1);

  return (<div className="p-2">
    <div>
      <Typography variant="h6" component="div">carnat's Part Development Randomizer</Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <div className={"mt-2 flex gap-8"}>

        <FormControl>
          <FormLabel id="group-label">Randomize parts for:</FormLabel>
          <RadioGroup
            row
            aria-labelledby="group-label"
            name="row-radio-buttons-group"
            value={opt}
            onChange={e => setOpt(e.target.value)}
          >
            <FormControlLabel value="AI" control={<Radio />} label="AI" />
            <FormControlLabel value="PLAYER" control={<Radio />} label="Player" />
            <FormControlLabel value="ALL" control={<Radio />} label="All Teams" />
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel id="group-label">Multiplier {intensity.toFixed(1)}:</FormLabel>
          <Slider
            sx={{ minWidth: 200 }}
            value={intensity}
            min={0.1}
            max={5}
            step={0.1}
            onChange={e => setIntensity(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel id="group-label">AI Difficulty {difficulty.toFixed(1)}:</FormLabel>
          <Slider
            sx={{ minWidth: 200 }}
            value={difficulty}
            min={-2}
            max={2}
            step={0.1}
            onChange={e => setDifficulty(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel id="group-label">Execute:</FormLabel>

          <Button onClick={() => {

            const dateToDay = d => Math.floor((+d + 2208988800000) / 86400000) + 2;
            let log = "Log: ";
            db.exec("CREATE TABLE IF NOT EXISTS Modding_KV ('key' TEXT NOT NULL, 'value' TEXT, PRIMARY KEY('key'))");

            const [{ Day, CurrentSeason }] = db.query("SELECT Day, CurrentSeason FROM Player_State");
            const [{ TeamID: PlayerTID }] = db.query("SELECT TeamID FROM Player");

            const results = db.query(`SELECT value FROM Modding_KV WHERE key = "carnat_randomizer_last_date"`)

            const StartDay = (results.length > 0 && parseInt(results[0].value)) ?
              parseInt(results[0].value) :
              dateToDay(new Date(`${CurrentSeason}-01-01`)); // start from current season

            const designsToModify = db.query(
              `SELECT DesignID, PartType, TeamID FROM Parts_Designs WHERE DayCompleted BETWEEN ${StartDay} AND ${Day}` + (
                opt === "AI" ? ` AND TeamID != ${PlayerTID}` : (opt === "PLAYER" ? ` AND TeamID = ${TeamID}` : "")
              )
            );

            for(const {DesignID, PartType, TeamID} of designsToModify) {
              console.log({DesignID, PartType, TeamID});
              const previousDesigns = db.query(`SELECT DesignID FROM Parts_Designs
                WHERE PartType=${PartType} AND TeamID=${TeamID} AND DesignID < ${DesignID}
                ORDER BY DesignID DESC LIMIT 1`);

              const currentDesigns = db.query(`SELECT DesignID FROM Parts_Designs
                WHERE PartType=${PartType} AND TeamID=${TeamID} AND DesignID = ${DesignID}
                ORDER BY DesignID DESC LIMIT 1`);


              if (previousDesigns.length > 0 && currentDesigns.length > 0) {
                const previousDesignID = previousDesigns[0].DesignID;
                const currentDesignID = currentDesigns[0].DesignID;

                const previousValues = {};
                const currentValues = {};

                for(const {PartStat, Value} of db.query(
                  `SELECT PartStat, Value FROM Parts_Designs_StatValues  WHERE DesignID = ${previousDesignID}`
                )) {
                  previousValues[PartStat] = Value;
                }

                for(const {PartStat, Value} of db.query(
                  `SELECT PartStat, Value FROM Parts_Designs_StatValues  WHERE DesignID = ${currentDesignID}`
                )) {
                  currentValues[PartStat] = Value;
                  if (PartStat === 15) {
                    continue;
                  }
                  const previousValue = previousValues[PartStat];

                  if (previousValue !== undefined) {
                    const diff = Math.abs(Value - previousValue) * intensity;
                    const newValue = Value + (Math.random() * 2 - 1) * diff;
                    const adjust = TeamID !== PlayerTID ? diff * difficulty : 0;
                    const adjustedValue  = newValue + adjust;
                    db.exec(`UPDATE Parts_Designs_StatValues SET Value=${adjustedValue} WHERE DesignID=${currentDesignID} AND PartStat=${PartStat}`);
                    log += `
DesignID: ${DesignID}, PartStat: ${PartStat}, Previous DesignID: ${previousDesignID},
Previous Value: ${previousValue}, Current Value: ${Value}, Diff: ${diff}, 
New Value: ${newValue}, Adjust: ${adjust}, Adjusted: ${adjustedValue}`;
                  }
                }
              }
            }
            db.exec(`DELETE FROM Modding_KV WHERE key = "carnat_randomizer_last_date"`);
            db.exec(`INSERT INTO Modding_KV VALUES ("carnat_randomizer_last_date", "${Day}")`);
            setLog(log);

          }} variant="contained">Randomize</Button>
        </FormControl>
      </div>
    </div>
    <div className="w-full mt-2">
      <p className="mb-2">Log Output</p>
      <TextField readOnly value={log} className="w-full" rows={10} multiline />
    </div>
  </div>);
}