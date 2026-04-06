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
    <Box sx={{
      border: 1,
      borderColor: "divider",
      mb: 2,
      backgroundColor: "rgba(255,255,255,0.015)",
      px: 1,
    }}>
      <TabList
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 44,
          "& .MuiTabs-indicator": {
            height: 2,
          },
          "& .MuiTab-root": {
            minHeight: 44,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 14,
            color: "text.secondary",
            px: 1.5,
          },
          "& .MuiTab-root.Mui-selected": {
            color: "text.primary",
            backgroundColor: "rgba(255,255,255,0.035)",
          },
        }}
      >
        {_options.map((t, _idx) => <Tab
          label={t.name}
          value={_idx.toString(10)}
          key={_idx.toString(10)}
        />)}
      </TabList>
    </Box>
    {_options.map((t, _idx) => <TabPanel value={_idx.toString(10)} key={_idx.toString(10)} sx={{ px: 0, pt: 0 }}>
      {t.tab}
    </TabPanel>)}
  </TabContext>;
}
