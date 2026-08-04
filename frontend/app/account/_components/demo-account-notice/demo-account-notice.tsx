import { Alert } from "@/components/ui/alert";

export function DemoAccountNotice() {
  return (
    <Alert tone="neutral">
      This is a shared demo account, so changes here are disabled. Feel free
      to look around — just nothing will save.
    </Alert>
  );
}
