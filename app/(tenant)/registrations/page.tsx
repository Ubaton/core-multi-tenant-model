/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATIONS PAGE (authenticated)
 * Shows the church's registration QR code + shareable link, and lists the
 * submissions people have made through the public form.
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Loader2, QrCode, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccessDenied } from '@/components/permission-gate';
import {
  useCheckInChurchOpeningRegistration,
  useMarkRegistrationReviewed,
  useRegistrationLink,
  useRegistrations,
  useRotateRegistrationLink,
  type Registration,
  type RegistrationFilters,
} from '@/lib/client';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { REGISTRATION_SECTIONS } from '@/lib/registration/fields';
import { REGISTRATION_SECTIONS as OPENING_SECTIONS } from '@/lib/church-opening/fields';
import { normalizeRegistrationCode } from '@/lib/church-opening/attendance';
import { canManageRegistrationLink } from '@/lib/registration/permissions';

const PAGE_SIZE = 20;
const PNG_SIZE = 1024;
const PNG_MARGIN = 64;
const openingDateTime = new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Johannesburg',
});

function LinkCard({ canManage, opening = false }: { canManage: boolean; opening?: boolean }) {
  const { data: link, isLoading, error, refetch } = useRegistrationLink(opening);
  const rotate = useRotateRegistrationLink(opening);
  const qrRef = useRef<HTMLDivElement>(null);

  const url = link ? `${window.location.origin}/${opening ? 'church-opening' : 'register'}/${link.token}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    );
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PNG_SIZE + PNG_MARGIN * 2;
      canvas.height = canvas.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        toast.error('Could not create the image');
        return;
      }
      // White background and quiet zone keep the code scannable from print or dark mode.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, PNG_MARGIN, PNG_MARGIN, PNG_SIZE, PNG_SIZE);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((png) => {
        if (!png) {
          toast.error('Could not create the image');
          return;
        }
        const href = URL.createObjectURL(png);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = opening ? 'church-opening-qr.png' : 'registration-qr.png';
        anchor.click();
        URL.revokeObjectURL(href);
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      toast.error('Could not create the image');
    };
    image.src = svgUrl;
  };

  const handleRotate = async () => {
    if (link && !window.confirm('Generate a new link? The current QR code and link will stop working immediately.')) {
      return;
    }
    try {
      await rotate.mutateAsync();
      toast.success(link ? 'New link generated' : 'Registration link created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate the link');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{opening ? 'Church opening QR code' : 'Registration QR code'}</CardTitle>
        <CardDescription>
          Anyone who scans this or opens the link can fill in the registration form without logging in. They see
          the form only, nothing else on the site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
        ) : error ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">Could not load the registration link. Please try again.</p>
            <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : !link ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">No registration link has been created yet.</p>
            {canManage && (
              <Button onClick={handleRotate} disabled={rotate.isPending}>
                <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
                Create registration link
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div ref={qrRef} className="w-fit rounded-xl border bg-white p-4">
              <QRCodeSVG value={url} size={176} level="M" marginSize={0} title="Registration QR code" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <Input readOnly value={url} aria-label="Registration link" onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2">
                {opening && (
                  <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>
                    Open registration form<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                <Button variant="outline" onClick={copy}>
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy link
                </Button>
                <Button variant="outline" onClick={downloadQr}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download QR (PNG)
                </Button>
                {canManage && (
                  <Button variant="outline" onClick={handleRotate} disabled={rotate.isPending}>
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Generate new link
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Generating a new link revokes the old one, use it if the link was shared by mistake.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegistrationDetails({ registration, opening = false }: { registration: Registration; opening?: boolean }) {
  return (
    <div className="grid gap-6 border-t bg-muted/30 p-4 sm:grid-cols-2">
      {(opening ? OPENING_SECTIONS : REGISTRATION_SECTIONS).map((section) => {
        const filled = section.fields.filter((f) => registration.data[f.key]);
        if (filled.length === 0) return null;
        return (
          <div key={section.id}>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{section.title}</h4>
            <dl className="space-y-1 text-sm">
              {filled.map((f) => (
                <div key={f.key} className="flex gap-2">
                  <dt className="w-44 shrink-0 text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 break-words text-foreground">{registration.data[f.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function SubmissionsCard({
  canEdit,
  opening = false,
  initialSearch = '',
}: {
  canEdit: boolean;
  opening?: boolean;
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [attendance, setAttendance] = useState<RegistrationFilters['attendance']>();
  const [registeredBefore, setRegisteredBefore] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useRegistrations({
    search: search || undefined,
    attendance,
    registeredBefore: registeredBefore || undefined,
    page,
    limit: PAGE_SIZE,
  }, opening);
  const markReviewed = useMarkRegistrationReviewed(opening);
  const checkIn = useCheckInChurchOpeningRegistration();

  const handleReviewed = async (id: string) => {
    try {
      await markReviewed.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    }
  };

  const handleCheckIn = async (registration: Registration) => {
    try {
      await checkIn.mutateAsync(registration.id);
      toast.success(`${registration.names} ${registration.surname} is checked in`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not check in attendee');
    }
  };

  const meta = data?.meta;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{opening ? 'Attendance and submissions' : 'Submissions'}{meta ? ` (${meta.totalCount})` : ''}</CardTitle>
        {opening && (
          <CardDescription>Scan an attendee’s QR code or find their registration below, then select Check in.</CardDescription>
        )}
        <div className="relative max-w-sm pt-2">
          <Search className="absolute left-2.5 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-8"
            placeholder={opening ? 'Search code, name, cell number or email' : 'Search name, cell number or email'}
            aria-label={opening ? 'Search by registration code, name, cell number or email' : 'Search submissions'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {opening && (
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="opening-attendance">Attendance</Label>
              <select
                id="opening-attendance"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={attendance ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setAttendance(value === 'checked-in' || value === 'not-checked-in' ? value : undefined);
                  setPage(1);
                }}
              >
                <option value="">All registrations</option>
                <option value="checked-in">Checked in</option>
                <option value="not-checked-in">Not checked in</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opening-registration-cutoff">Registered before (SAST)</Label>
              <Input
                id="opening-registration-cutoff"
                type="date"
                value={registeredBefore}
                onChange={(event) => {
                  setRegisteredBefore(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        ) : error ? (
          <div className="space-y-3 p-6">
            <p role="alert" className="text-sm text-destructive">Could not load submissions. Please try again.</p>
            <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {search || attendance || registeredBefore ? 'No submissions match your filters.' : 'No submissions yet.'}
          </p>
        ) : (
          <ul className="divide-y">
            {data.data.map((r) => {
              const isOpen = openId === r.id;
              return (
                <li key={r.id}>
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      aria-expanded={isOpen}
                      onClick={() => setOpenId(isOpen ? null : r.id)}
                    >
                      <span className="font-medium text-foreground">
                        {r.names} {r.surname}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {r.cellNumber}
                        {r.email ? ` · ${r.email}` : ''}
                        {!opening && ` · ${new Date(r.createdAt).toLocaleDateString()}`}
                      </span>
                      {opening && (
                        <span className="block text-xs text-muted-foreground">
                          Registered <time dateTime={r.createdAt}>{openingDateTime.format(new Date(r.createdAt))}</time>
                          {r.registrationCode && <> · <span className="font-mono">{r.registrationCode}</span></>}
                        </span>
                      )}
                    </button>
                    {opening && (
                      r.checkedInAt ? (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <Badge>Checked in</Badge>
                          <time className="block" dateTime={r.checkedInAt}>{openingDateTime.format(new Date(r.checkedInAt))}</time>
                        </div>
                      ) : <Badge variant="outline">Not checked in</Badge>
                    )}
                    <Badge variant={r.status === 'PENDING' ? 'default' : 'secondary'}>
                      {r.status === 'PENDING' ? 'New' : 'Reviewed'}
                    </Badge>
                    {opening && canEdit && !r.checkedInAt && (
                      <Button size="sm" onClick={() => handleCheckIn(r)} disabled={checkIn.isPending}>
                        Check in<span className="sr-only"> {r.names} {r.surname}</span>
                      </Button>
                    )}
                    {canEdit && r.status === 'PENDING' && (
                      <Button size="sm" variant="outline" onClick={() => handleReviewed(r.id)} disabled={markReviewed.isPending}>
                        Mark reviewed
                      </Button>
                    )}
                  </div>
                  {isOpen && <RegistrationDetails registration={r} opening={opening} />}
                </li>
              );
            })}
          </ul>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!meta.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpeningSubmissions({ canEdit }: { canEdit: boolean }) {
  const searchParams = useSearchParams();
  const code = normalizeRegistrationCode(searchParams.get('checkIn') ?? '') ?? '';

  return <SubmissionsCard key={code} opening canEdit={canEdit} initialSearch={code} />;
}

export default function RegistrationsPage() {
  const { canView, canEdit, role, isLoading } = useModulePermissions();

  if (!isLoading && !canView('members')) {
    return <AccessDenied message="You don't have permission to view registrations." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registrations</h1>
        <p className="text-muted-foreground">Let people register themselves by scanning a QR code.</p>
      </div>
      <LinkCard canManage={canManageRegistrationLink(role)} />
      <SubmissionsCard canEdit={canEdit('members')} />
      <section className="space-y-6" aria-labelledby="church-opening-title">
        <h2 id="church-opening-title" className="text-xl font-bold text-foreground">VILLAGE OF THE LORD CHURCH OPENING.</h2>
        <LinkCard opening canManage={canManageRegistrationLink(role)} />
        <div id="church-opening-check-in">
          <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading submissions" />}>
            <OpeningSubmissions canEdit={canEdit('members')} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
