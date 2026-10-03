/**
 * ════════════════════════════════════════════════════════════════════════════
 * IMPORT MEMBERS PAGE
 * Upload a CSV (Name, Surname, Email, Cell Number, Country, Province),
 * preview validation, then import into the current church.
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessDenied } from '@/components/permission-gate';
import { useImportMembers, type ImportMembersResult } from '@/lib/client';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import {
  IMPORT_COLUMNS,
  IMPORT_TEMPLATE_CSV,
  MAX_IMPORT_ROWS,
  mapHeaders,
  parseCsv,
  phoneKey,
  toRawRows,
  validateImportRow,
  type ImportRow,
} from '@/lib/members-import';
import { toast } from 'sonner';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PREVIEW_LIMIT = 100;

interface PreviewRow {
  rowNumber: number;
  name: string;
  row: ImportRow | null;
  errors: string[];
}

function downloadTemplate() {
  const blob = new Blob([IMPORT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'member-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function buildPreview(text: string): { rows: PreviewRow[]; missing: string[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], missing: IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.label) };

  const mapping = mapHeaders(table[0]);
  if (mapping.missing.length > 0) return { rows: [], missing: mapping.missing };

  const seen = new Set<string>();
  const rows = toRawRows(table, mapping).map((raw, index): PreviewRow => {
    const result = validateImportRow(raw);
    const rowNumber = index + 2;
    if (!result.ok) {
      const name = [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim() || '(blank)';
      return { rowNumber, name, row: null, errors: result.errors };
    }
    const key = phoneKey(result.row.phone);
    const name = `${result.row.firstName} ${result.row.lastName}`;
    if (seen.has(key)) {
      return { rowNumber, name, row: null, errors: ['Duplicate cell number in this file'] };
    }
    seen.add(key);
    return { rowNumber, name, row: result.row, errors: [] };
  });

  return { rows, missing: [] };
}

export default function ImportMembersPage() {
  const { canCreate, isLoading: permissionsLoading } = useModulePermissions();
  const importMembers = useImportMembers();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<ImportMembersResult | null>(null);

  const validRows = useMemo(() => rows.flatMap((r) => (r.row ? [r.row] : [])), [rows]);
  const errorCount = rows.length - validRows.length;

  if (!permissionsLoading && !canCreate('members')) {
    return <AccessDenied message="You don't have permission to import members." />;
  }

  const reset = () => {
    setFileName('');
    setRows([]);
    setMissing([]);
    setResult(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    reset();
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file. In Excel use File → Save As → CSV.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is too large (2 MB maximum).');
      return;
    }

    const preview = buildPreview(await file.text());
    if (preview.rows.length > MAX_IMPORT_ROWS) {
      toast.error(`A maximum of ${MAX_IMPORT_ROWS} members can be imported at once. Split the file and try again.`);
      return;
    }

    setFileName(file.name);
    setRows(preview.rows);
    setMissing(preview.missing);
  };

  const handleImport = async () => {
    try {
      const summary = await importMembers.mutateAsync(validRows);
      setResult(summary);
      setRows([]);
      toast.success(`${summary.created} member${summary.created === 1 ? '' : 's'} imported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/members">
          <Button variant="ghost" size="icon" aria-label="Back to members">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Members</h1>
          <p className="text-muted-foreground">Add many members at once from a CSV file</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Prepare your file</CardTitle>
          <CardDescription>
            Use these column headings in the first row. Name, Surname and Cell Number are required;
            Country defaults to South Africa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {IMPORT_COLUMNS.map((column) => (
              <Badge key={column.key} variant={column.required ? 'default' : 'secondary'}>
                {column.label}
                {column.required ? ' *' : ''}
              </Badge>
            ))}
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload and review</CardTitle>
          <CardDescription>Existing cell numbers are skipped, never overwritten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="sr-only"
              id="member-import-file"
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose CSV file
            </Button>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {missing.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              Missing required column{missing.length > 1 ? 's' : ''}: {missing.join(', ')}
            </p>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge className="bg-success/10 text-success">{validRows.length} ready to import</Badge>
                {errorCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive">{errorCount} with problems (will be skipped)</Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Row</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Cell Number</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Province</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_LIMIT).map((r) => (
                      <tr key={r.rowNumber} className="border-b">
                        <td className="py-2 px-3 text-muted-foreground">{r.rowNumber}</td>
                        <td className="py-2 px-3">{r.name}</td>
                        <td className="py-2 px-3">{r.row?.phone ?? '—'}</td>
                        <td className="py-2 px-3">{r.row?.state ?? '—'}</td>
                        <td className="py-2 px-3">
                          {r.errors.length === 0 ? (
                            <span className="text-success">Ready</span>
                          ) : (
                            <span className="text-destructive">{r.errors.join('; ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="text-sm text-muted-foreground">
                  Showing the first {PREVIEW_LIMIT} of {rows.length} rows.
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={validRows.length === 0 || importMembers.isPending}>
                  {importMembers.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import {validRows.length} member{validRows.length === 1 ? '' : 's'}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={importMembers.isPending}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {result && <ImportResult result={result} onAnother={reset} />}
    </div>
  );
}

function ImportResult({ result, onAnother }: { result: ImportMembersResult; onAnother: () => void }) {
  const problems = [...result.skipped, ...result.invalid].sort((a, b) => a.row - b.row);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          Import complete
        </CardTitle>
        <CardDescription>
          {result.created} of {result.total} rows imported
          {problems.length > 0 ? `, ${problems.length} skipped` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {problems.length > 0 && (
          <ul className="space-y-1 text-sm">
            {problems.map((p) => (
              <li key={p.row} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
                <span>
                  Row {p.row} ({p.name}): {p.reasons.join('; ')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Link href="/members">
            <Button>View members</Button>
          </Link>
          <Button variant="outline" onClick={onAnother}>
            Import another file
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
