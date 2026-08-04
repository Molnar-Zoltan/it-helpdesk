"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { isDemoUserId } from "@helpdesk/shared";
import { Tabs } from "@/components/ui/tabs";
import type { TabItem } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { useProfile } from "@/lib/queries/use-profile";
import { NameTab } from "../name-tab";
import { EmailTab } from "../email-tab";
import { PasswordTab } from "../password-tab";
import { DeleteAccountTab } from "../delete-account-tab";

const TABS: TabItem[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "delete", label: "Delete account" },
];

const DEFAULT_TAB = "name";
const VALID_TAB_IDS = new Set(TABS.map((tab) => tab.id));

export function AccountView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedTab = searchParams.get("tab");
  const activeTab = VALID_TAB_IDS.has(requestedTab ?? "")
    ? (requestedTab as string)
    : DEFAULT_TAB;

  const handleTabChange = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", id);
    router.replace(`/account?${params.toString()}`, { scroll: false });
  };

  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading account" />
      </div>
    );
  }

  // proxy.ts's redirect is a UX shortcut based on cookie presence, not the
  // real auth boundary — a session can still turn out to be invalid once
  // the backend actually checks it (e.g. the account was deleted from
  // another tab). Point back to login rather than rendering a dead page.
  if (isError || !profile) {
    return (
      <Alert tone="danger">
        We couldn&apos;t load your account.{" "}
        <a href="/login?redirectTo=/account" className="underline">
          Log in again
        </a>
        .
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your profile, credentials, and account data.
        </p>
      </div>

      <Tabs
        label="Account settings sections"
        tabs={TABS}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <Card>
        {activeTab === "name" && (
          <NameTab profile={profile} isDemo={isDemoUserId(profile.id)} />
        )}
        {activeTab === "email" && (
          <EmailTab profile={profile} isDemo={isDemoUserId(profile.id)} />
        )}
        {activeTab === "password" && (
          <PasswordTab isDemo={isDemoUserId(profile.id)} />
        )}
        {activeTab === "delete" && (
          <DeleteAccountTab isDemo={isDemoUserId(profile.id)} />
        )}
      </Card>
    </div>
  );
}
