import type { UserProfile } from "@/lib/api/types";

interface NameTabProps {
  profile: UserProfile;
}

// Read-only for now — the edit form (PATCH /users/me) lands in Step 5.4.3.
export function NameTab({ profile }: NameTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Name</h2>
        <p className="mt-1 text-sm text-text-secondary">
          The name shown on your tickets and in the header menu.
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-text-secondary">First name</dt>
        <dd className="text-text">{profile.firstName}</dd>
        <dt className="text-text-secondary">Last name</dt>
        <dd className="text-text">{profile.lastName}</dd>
      </dl>
    </div>
  );
}
