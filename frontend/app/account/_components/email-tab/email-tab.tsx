import type { UserProfile } from "@/lib/api/types";

interface EmailTabProps {
  profile: UserProfile;
}

// Read-only for now — the edit form (PATCH /users/me/email) lands in Step 5.4.5.
export function EmailTab({ profile }: EmailTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Email</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Used to log in and identify your account.
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-text-secondary">Email address</dt>
        <dd className="text-text">{profile.email}</dd>
      </dl>
    </div>
  );
}
