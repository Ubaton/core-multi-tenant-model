'use client';

import { useState } from 'react';
import RegistrationsPage from '@/app/(tenant)/registrations/page';
import { useCurrentUser, useTenants } from '@/lib/client';
import { setTenantId } from '@/lib/client/api-client';
import { AccessDenied } from '@/components/permission-gate';

export default function SuperAdminRegistrationsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();

  if (userLoading) return <p role="status">Loading account…</p>;
  if (user?.role !== 'SUPER_ADMIN') {
    return <AccessDenied message="Only super admins can access this page." />;
  }

  return <ChurchRegistrations />;
}

function ChurchRegistrations() {
  const { data, isLoading, error } = useTenants({ limit: 100, isActive: true });
  const [selectedId, setSelectedId] = useState('');
  const churches = data?.data.filter((church) => church.isActive) ?? [];
  const selected = churches.find((church) => church.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="registration-church" className="block text-sm font-medium">Church</label>
        <select
          id="registration-church"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:max-w-md"
          value={selectedId}
          disabled={isLoading || Boolean(error)}
          onChange={(event) => {
            const id = event.target.value;
            if (id) setTenantId(id);
            setSelectedId(id);
          }}
        >
          <option value="">Select a church</option>
          {churches.map((church) => <option key={church.id} value={church.id}>{church.name}</option>)}
        </select>
        {isLoading && <p role="status" className="text-sm text-muted-foreground">Loading churches…</p>}
        {error && <p role="alert" className="text-sm text-destructive">Could not load churches. Please refresh and try again.</p>}
        {!isLoading && !error && churches.length === 0 && <p className="text-sm text-muted-foreground">No active churches are available.</p>}
        {selected && <p className="text-sm text-muted-foreground">Managing registrations for {selected.name}.</p>}
      </div>
      {selected ? <RegistrationsPage key={selected.id} /> : <p className="text-sm text-muted-foreground">Select a church to create its QR code and view registrations.</p>}
    </div>
  );
}
