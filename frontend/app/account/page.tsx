import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";
import { AccountView } from "./_components/account-view";

export const metadata: Metadata = {
  title: "Account — IT Helpdesk",
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading account" />
        </div>
      }
    >
      <AccountView />
    </Suspense>
  );
}
