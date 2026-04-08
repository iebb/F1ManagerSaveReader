import BoardPayments from "@/components/Finance/BoardPayments";
import SaveOperations from "@/components/Modding/SaveOperations";
import {VTabs} from "@/components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {
        name: "Board",
        tab: (
          <SaveOperations
            visibleTabs={["board"]}
            titleEyebrow="Team Workspace"
            title="Board"
            description="Adjust own-team confidence, tune the active board target, and compare board rating across teams."
            showLimitNote={false}
          />
        ),
      },
      {
        name: "Board Payments",
        tab: <BoardPayments />,
      },
    ]} />
  );
}
