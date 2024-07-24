import {MetadataContext} from "@/js/Contexts";
import {TabContext, TabList, TabPanel} from "@mui/lab";
import {Box, Tab} from "@mui/material";
import {useContext, useState} from "react";


export const VTabs = ({ options }) => {
  const {version, gameVersion} = useContext(MetadataContext);
  const [value, setValue] = useState("0");
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const cmp = require('semver-compare');

  const _options = options.filter(opt => {
    if (opt.versions) {
      return opt.versions.includes(version);
    }
    if (opt.minVersion) {
      if (typeof opt.minVersion === "number") {
        return version >= opt.minVersion;
      }
      return cmp(`${version}.${gameVersion}`, opt.minVersion) >= 0;
    }
    if (opt.devOnly) {
      return process.env.NODE_ENV === 'development';
    }
    return true;
  })


  return <TabContext value={value}>
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <TabList onChange={handleChange}>
        {_options.map((t, _idx) => <Tab label={t.name} value={_idx.toString(10)} key={_idx.toString(10)} />)}
      </TabList>
    </Box>
    {_options.map((t, _idx) => <TabPanel value={_idx.toString(10)} key={_idx.toString(10)} sx={{ px: 0 }}>
      {t.tab}
    </TabPanel>)}
  </TabContext>;
}
