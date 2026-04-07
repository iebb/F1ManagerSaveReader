import {Alert, AlertTitle} from "@mui/material";
import {useContext} from "react";
import {BasicInfoContext, MetadataContext} from "@/js/Contexts";
import RaceEditor from "@/components/RaceWeekend/RaceEditor";

export default function Page() {
  const basicInfo = useContext(BasicInfoContext);
  const { version } = useContext(MetadataContext);

  if (basicInfo.weekend.RaceID < 0) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>Unsupported</AlertTitle>
        You are not in a race weekend. Please save inside a race weekend.
      </Alert>
    );
  }

  if (version < 3) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>Unsupported</AlertTitle>
        Race Control requires F1 Manager 2023 or newer.
      </Alert>
    );
  }

  return <RaceEditor />;
}
