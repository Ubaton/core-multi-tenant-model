'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  HONEYPOT_FIELD,
  REGISTRATION_SECTIONS,
  validateRegistration,
  type RegistrationField,
} from '@/lib/church-opening/fields';

const SELECT_CLASS =
  'border-input bg-background/60 hover:bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-8 w-full rounded-lg border px-2.5 text-base outline-none transition-colors focus-visible:ring-[3px] md:text-sm';

interface FieldControlProps {
  field: RegistrationField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function FieldControl({ field, value, error, onChange }: FieldControlProps) {
  const id = `field-${field.key}`;
  const common = {
    id,
    name: field.key,
    required: field.required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  };

  let control: React.ReactNode;
  if (field.type === 'select') {
    control = (
      <select {...common} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'textarea') {
    control = <Textarea {...common} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
  } else {
    control = (
      <Input
        {...common}
        type={field.type === 'number' ? 'text' : field.type}
        inputMode={field.type === 'number' ? 'numeric' : field.type === 'tel' ? 'tel' : undefined}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </Label>
      {control}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function RegistrationForm({ token }: { token: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key));
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    const result = validateRegistration(values);
    if (!result.ok) {
      setErrors(result.errors);
      setFormError('Please correct the highlighted fields.');
      document.getElementById(`field-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    if (!consent) {
      setFormError('Please confirm that we may store your details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/church-opening-registration/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: values[HONEYPOT_FIELD] ?? '' }),
      });
      const body = await response.json().catch(() => null);

      if (response.ok) {
        setIsDone(true);
        return;
      }

      const details = body?.error?.details as Record<string, string[]> | undefined;
      if (details) {
        setErrors(Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v[0]])));
      }
      setFormError(body?.error?.message ?? 'Something went wrong. Please try again.');
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-foreground">Thank you!</h2>
          <p className="text-sm text-muted-foreground">
            Your details have been received. You can now close this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {REGISTRATION_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && <CardDescription>{section.description}</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : undefined}>
                <FieldControl
                  field={field}
                  value={values[field.key] ?? ''}
                  error={errors[field.key]}
                  onChange={(v) => setValue(field.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`field-${HONEYPOT_FIELD}`}>Leave this empty</label>
        <input
          id={`field-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values[HONEYPOT_FIELD] ?? ''}
          onChange={(e) => setValue(HONEYPOT_FIELD, e.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>I agree that the church may store and use these details for the church opening.</span>
      </label>

      {formError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Submitting…' : 'Submit registration'}
      </Button>
    </form>
  );
}
