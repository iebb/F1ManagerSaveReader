import SaveOperations from "@/components/Modding/SaveOperations";

export default function Page() {
  return (
    <SaveOperations
      visibleTabs={["pit-stop"]}
      titleEyebrow="Season Workspace"
      title="Pit Stop"
      description="Inspect pit stop award rows and timing-stage detail as a dedicated DHL fastest-pit-stop workspace."
      showLimitNote={false}
    />
  );
}
