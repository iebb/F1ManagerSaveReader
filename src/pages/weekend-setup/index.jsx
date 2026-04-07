import {Alert, AlertTitle} from "@mui/material";
import {useContext} from "react";
import {BasicInfoContext} from "@/js/Contexts";
import CarSetup from "@/components/RaceWeekend/CarSetup";

export default function Page() {
  const basicInfo = useContext(BasicInfoContext);

  if (basicInfo.weekend.RaceID < 0) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>Unsupported</AlertTitle>
        You are not in a race weekend. Please save inside a race weekend.
      </Alert>
    );
  }

  return <CarSetup />;
}
