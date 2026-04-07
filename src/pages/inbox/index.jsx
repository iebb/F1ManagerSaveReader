import SaveOperations from "@/components/Modding/SaveOperations";

export default function Page() {
  return (
    <SaveOperations
      visibleTabs={["inbox"]}
      titleEyebrow="Team Workspace"
      title="Inbox"
      description="Review mail state and recent event logs without dropping into the SQL editor."
      showLimitNote={false}
    />
  );
}
