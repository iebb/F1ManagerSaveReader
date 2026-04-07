import SaveOperations from "@/components/Modding/SaveOperations";

export default function Page() {
  return (
    <SaveOperations
      visibleTabs={["sporting"]}
      titleEyebrow="Race Workspace"
      title="Sporting Audit"
      description="Inspect pit stop awards, inspection outcomes, and grid penalty state as a dedicated race operations page."
      showLimitNote={false}
    />
  );
}
