/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATIONS PAGE (authenticated)
 * Shows the church's registration QR code + shareable link, and lists the
 * submissions people have made through the public form.
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Loader2, QrCode, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AccessDenied } from '@/components/permission-gate';
import {
  useMarkRegistrationReviewed,
  useRegistrationLink,
  useRegistrations,
  useRotateRegistrationLink,
  type Registration,
} from '@/lib/client';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { REGISTRATION_SECTIONS } from '@/lib/registration/fields';
import { REGISTRATION_SECTIONS as OPENING_SECTIONS } from '@/lib/church-opening/fields';
import { canManageRegistrationLink } from '@/lib/registration/permissions';

const PAGE_SIZE = 20;
const PNG_SIZE = 1024;
const PNG_MARGIN = 64;

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

function SubmissionsCard({ canEdit, opening = false }: { canEdit: boolean; opening?: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useRegistrations({ search: search || undefined, page, limit: PAGE_SIZE }, opening);
  const markReviewed = useMarkRegistrationReviewed(opening);

  const handleReviewed = async (id: string) => {
    try {
      await markReviewed.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    }
  };

  const meta = data?.meta;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions{meta ? ` (${meta.totalCount})` : ''}</CardTitle>
        <div className="relative max-w-sm pt-2">
          <Search className="absolute left-2.5 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-8"
            placeholder="Search name, cell number or email"
            aria-label="Search submissions"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
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
          <p className="p-6 text-sm text-muted-foreground">{search ? 'No submissions match your search.' : 'No submissions yet.'}</p>
        ) : opening ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Church opening submissions</caption>
              <thead className="border-b bg-muted/30">
                <tr>{['Name', 'Surname', 'Email', 'Cell Number', 'Country', 'Province', 'Status', 'Actions'].map((label) => (
                  <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((r) => (
                  <tr key={r.id}>
                    {[r.names, r.surname, r.email, r.cellNumber, r.data.country, r.data.province].map((value, index) => (
                      <td key={index} className="px-4 py-3">{value}</td>
                    ))}
                    <td className="px-4 py-3"><Badge variant={r.status === 'PENDING' ? 'default' : 'secondary'}>{r.status === 'PENDING' ? 'New' : 'Reviewed'}</Badge></td>
                    <td className="px-4 py-3">
                      {canEdit && r.status === 'PENDING' && (
                        <Button size="sm" variant="outline" onClick={() => handleReviewed(r.id)} disabled={markReviewed.isPending}>Mark reviewed<span className="sr-only">: {r.names} {r.surname}</span></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                        {r.email ? ` · ${r.email}` : ''} · {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <Badge variant={r.status === 'PENDING' ? 'default' : 'secondary'}>
                      {r.status === 'PENDING' ? 'New' : 'Reviewed'}
                    </Badge>
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
        <SubmissionsCard opening canEdit={canEdit('members')} />
      </section>
    </div>
  );
}
