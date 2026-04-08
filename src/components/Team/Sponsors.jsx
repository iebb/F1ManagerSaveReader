import SaveOperations from "@/components/Modding/SaveOperations";

export default function Sponsors() {
  return (
    <SaveOperations
      visibleTabs={["sponsorship"]}
      titleEyebrow="Team Workspace"
      title="Sponsorship"
      description="Manage the title sponsor, secondary sponsor slots, and review completed sponsorship history from the team workspace."
      showLimitNote={false}
    />
  );
}
