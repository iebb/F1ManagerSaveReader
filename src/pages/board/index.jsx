import SaveOperations from "@/components/Modding/SaveOperations";

export default function Page() {
  return (
    <SaveOperations
      visibleTabs={["board"]}
      titleEyebrow="Team Workspace"
      title="Board"
      description="Adjust own-team confidence, tune the active board target, and compare board rating across teams."
      showLimitNote={false}
    />
  );
}
