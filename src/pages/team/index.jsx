import Contracts from "@/components/Team/Contracts";
import SaveOperations from "@/components/Modding/SaveOperations";
import {VTabs} from "@/components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Contracts", tab: <Contracts />},
      {
        name: "Sponsorship",
        tab: (
          <SaveOperations
            visibleTabs={["sponsorship"]}
            titleEyebrow="Team Workspace"
            title="Sponsorship"
            description="Manage active sponsors, available packages, and race bonus selections from the team area instead of the meta-tool workspace."
            showLimitNote={false}
          />
        ),
      },
    ]} />
  );
}
