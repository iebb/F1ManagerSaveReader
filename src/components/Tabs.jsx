import {Box} from "@mui/material";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import TabContext from "@mui/lab/TabContext";
import {useState} from "react";

export const VTabs = ({ options }) => {

  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  return <TabContext value={value}>
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <TabList onChange={handleChange}>
        {options.map((t, _idx) => <Tab label={t.name} value={_idx} key={_idx} />)}
      </TabList>
    </Box>
    {options.map((t, _idx) => <TabPanel value={_idx} key={_idx}>
      {t.tab}
    </TabPanel>)}
  </TabContext>;

}