import * as React from "react";
import * as material from "@mui/material";
import StringToReactComponent from 'string-to-react-component';
import {useContext} from "react";
import {DatabaseContext, MetadataContext} from "@/js/Contexts";
import {Alert, AlertTitle} from "@mui/material";


const script = "\n" +
  "  const dateToDay = d => Math.floor((+d + 2208988800000) / 86400000) + 2;\n" +
  "  const { Button, Divider, FormControl,\n" +
  "    FormControlLabel, FormLabel, Radio, RadioGroup, Slider, TextField,\n" +
  "    Typography } = material;\n" +
  "  const [opt, setOpt] = React.useState('ALL');\n" +
  "  const [log, setLog] = React.useState('');\n" +
  "  const [difficulty, setDifficulty] = React.useState(0);\n" +
  "  const [intensity, setIntensity] = React.useState(1);\n" +
  "\n" +
  "  return (<div className=\"p-2\">\n" +
  "    <div>\n" +
  "      <Typography variant=\"h6\" component=\"div\">carnat's Part Development Randomizer</Typography>\n" +
  "      <Divider variant=\"fullWidth\" sx={{ my: 2 }} />\n" +
  "      <div className={\"mt-2 flex gap-8\"}>\n" +
  "\n" +
  "        <FormControl>\n" +
  "          <FormLabel id=\"group-label\">Randomize parts for:</FormLabel>\n" +
  "          <RadioGroup\n" +
  "            row\n" +
  "            aria-labelledby=\"group-label\"\n" +
  "            name=\"row-radio-buttons-group\"\n" +
  "            value={opt}\n" +
  "            onChange={e => setOpt(e.target.value)}\n" +
  "          >\n" +
  "            <FormControlLabel value=\"AI\" control={<Radio />} label=\"AI\" />\n" +
  "            <FormControlLabel value=\"PLAYER\" control={<Radio />} label=\"Player\" />\n" +
  "            <FormControlLabel value=\"ALL\" control={<Radio />} label=\"All Teams\" />\n" +
  "          </RadioGroup>\n" +
  "        </FormControl>\n" +
  "        <FormControl>\n" +
  "          <FormLabel id=\"group-label\">Multiplier {intensity.toFixed(1)}:</FormLabel>\n" +
  "          <Slider\n" +
  "            sx={{ minWidth: 200 }}\n" +
  "            value={intensity}\n" +
  "            min={0.1}\n" +
  "            max={5}\n" +
  "            step={0.1}\n" +
  "            onChange={e => setIntensity(e.target.value)}\n" +
  "          />\n" +
  "        </FormControl>\n" +
  "        <FormControl>\n" +
  "          <FormLabel id=\"group-label\">AI Difficulty {difficulty.toFixed(1)}:</FormLabel>\n" +
  "          <Slider\n" +
  "            sx={{ minWidth: 200 }}\n" +
  "            value={difficulty}\n" +
  "            min={-2}\n" +
  "            max={2}\n" +
  "            step={0.1}\n" +
  "            onChange={e => setDifficulty(e.target.value)}\n" +
  "          />\n" +
  "        </FormControl>\n" +
  "        <FormControl>\n" +
  "          <FormLabel id=\"group-label\">Execute:</FormLabel>\n" +
  "\n" +
  "          <Button onClick={() => {\n" +
  "\n" +
  "            let log = \"Log: \";\n" +
  "            db.exec(\"CREATE TABLE IF NOT EXISTS Modding_KV ('key' TEXT NOT NULL, 'value' TEXT, PRIMARY KEY('key'))\");\n" +
  "\n" +
  "            const [{ Day, CurrentSeason }] = db.query(\"SELECT Day, CurrentSeason FROM Player_State\");\n" +
  "            const [{ TeamID: PlayerTID }] = db.query(\"SELECT TeamID FROM Player\");\n" +
  "\n" +
  "            const results = db.query(`SELECT value FROM Modding_KV WHERE key = \"carnat_randomizer_last_date\"`)\n" +
  "\n" +
  "            const StartDay = (results.length > 0 && parseInt(results[0].value)) ?\n" +
  "              parseInt(results[0].value) :\n" +
  "              dateToDay(new Date(`${CurrentSeason}-01-01`)); // start from current season\n" +
  "\n" +
  "            const designsToModify = db.query(\n" +
  "              `SELECT DesignID, PartType, TeamID FROM Parts_Designs WHERE DayCompleted BETWEEN ${StartDay} AND ${Day}` + (\n" +
  "                opt === \"AI\" ? ` AND TeamID != ${PlayerTID}` : (opt === \"PLAYER\" ? ` AND TeamID = ${TeamID}` : \"\")\n" +
  "              )\n" +
  "            );\n" +
  "\n" +
  "            for(const {DesignID, PartType, TeamID} of designsToModify) {\n" +
  "              console.log({DesignID, PartType, TeamID});\n" +
  "              const previousDesigns = db.query(`SELECT DesignID FROM Parts_Designs\n" +
  "                WHERE PartType=${PartType} AND TeamID=${TeamID} AND DesignID < ${DesignID}\n" +
  "                ORDER BY DesignID DESC LIMIT 1`);\n" +
  "\n" +
  "              const currentDesigns = db.query(`SELECT DesignID FROM Parts_Designs\n" +
  "                WHERE PartType=${PartType} AND TeamID=${TeamID} AND DesignID = ${DesignID}\n" +
  "                ORDER BY DesignID DESC LIMIT 1`);\n" +
  "\n" +
  "\n" +
  "              if (previousDesigns.length > 0 && currentDesigns.length > 0) {\n" +
  "                const previousDesignID = previousDesigns[0].DesignID;\n" +
  "                const currentDesignID = currentDesigns[0].DesignID;\n" +
  "\n" +
  "                const previousValues = {};\n" +
  "                const currentValues = {};\n" +
  "\n" +
  "                for(const {PartStat, Value} of db.query(\n" +
  "                  `SELECT PartStat, Value FROM Parts_Designs_StatValues  WHERE DesignID = ${previousDesignID}`\n" +
  "                )) {\n" +
  "                  previousValues[PartStat] = Value;\n" +
  "                }\n" +
  "\n" +
  "                for(const {PartStat, Value} of db.query(\n" +
  "                  `SELECT PartStat, Value FROM Parts_Designs_StatValues  WHERE DesignID = ${currentDesignID}`\n" +
  "                )) {\n" +
  "                  currentValues[PartStat] = Value;\n" +
  "                  if (PartStat === 15) {\n" +
  "                    continue;\n" +
  "                  }\n" +
  "                  const previousValue = previousValues[PartStat];\n" +
  "\n" +
  "                  if (previousValue !== undefined) {\n" +
  "                    const diff = Math.abs(Value - previousValue) * intensity;\n" +
  "                    const newValue = Value + (Math.random() * 2 - 1) * diff;\n" +
  "                    const adjust = TeamID !== PlayerTID ? diff * difficulty : 0;\n" +
  "                    const adjustedValue  = newValue + adjust;\n" +
  "                    db.exec(`UPDATE Parts_Designs_StatValues SET Value=${adjustedValue} WHERE DesignID=${currentDesignID} AND PartStat=${PartStat}`);\n" +
  "                    log += `\n" +
  "DesignID: ${DesignID}, PartStat: ${PartStat}, Previous DesignID: ${previousDesignID},\n" +
  "Previous Value: ${previousValue}, Current Value: ${Value}, Diff: ${diff}, \n" +
  "New Value: ${newValue}, Adjust: ${adjust}, Adjusted: ${adjustedValue}`;\n" +
  "                  }\n" +
  "                }\n" +
  "              }\n" +
  "            }\n" +
  "            db.exec(`DELETE FROM Modding_KV WHERE key = \"carnat_randomizer_last_date\"`);\n" +
  "            db.exec(`INSERT INTO Modding_KV VALUES (\"carnat_randomizer_last_date\", \"${Day}\")`);\n" +
  "            setLog(log);\n" +
  "\n" +
  "          }} variant=\"contained\">Randomize</Button>\n" +
  "        </FormControl>\n" +
  "      </div>\n" +
  "    </div>\n" +
  "    <div className=\"w-full mt-2\">\n" +
  "      <p className=\"mb-2\">Log Output</p>\n" +
  "      <TextField readOnly value={log} className=\"w-full\" rows={10} multiline />\n" +
  "    </div>\n" +
  "  </div>);";

export default function Plugins() {
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

  return (
    <div>
      <Alert severity="warning" sx={{ mb: 2 }}>
        <AlertTitle>Warning</AlertTitle>
        The plugin feature is in development, and here is a demonstration. <br />
        Writing tiny scripts will be possible, but make sure you know what you are doing before continue!
      </Alert>
      <StringToReactComponent
        data={exposed}>
        {`(props) => {
         const { db, metadata, material } = props;
         ${script}
        }`}
      </StringToReactComponent>
    </div>
  );
}