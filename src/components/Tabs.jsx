import {TabContext, TabList, TabPanel} from "@mui/lab";
import {Box, Tab, Tabs} from "@mui/material";
import {useRouter} from "next/router";
import {useContext, useState} from "react";
import {MetadataContext} from "./Contexts";


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

export const NavTabs = ({ options }) => {
  const router = useRouter();
  let currentRoute = 0;
  const path = router.asPath;
  options.forEach((option, _idx) => {
    if (option.navigator === path) {
      currentRoute = _idx;
    }
    if (path.startsWith(option.navigator + "/")) {
      currentRoute = _idx;
    }
  });
  const [value, setValue] = useState(currentRoute);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    router.push(options[newValue].navigator);
  };
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 1 }}>
      <Tabs value={value} aria-label="basic tabs example" onChange={handleChange}>
        {
          options.map((t, _idx) => (
            <Tab label={t.name} value={_idx} key={_idx} />
          ))
        }
      </Tabs>
    </Box>
  );
}