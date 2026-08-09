import { Alert } from "@/components/ui/alert";
import { DEMO_ACCOUNT_NOTICE_TEXT } from "@/lib/constants/text/account.text";

export function DemoAccountNotice() {
  return (
    <Alert tone="neutral">
      {DEMO_ACCOUNT_NOTICE_TEXT.MESSAGE}
    </Alert>
  );
}
