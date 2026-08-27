/**
 * ════════════════════════════════════════════════════════════════════════════
 * CREATE TENANT PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Building2,
  UserPlus,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  Shield,
  UserCog,
  User,
  Phone,
  Users,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreateTenant, useTenants } from '@/lib/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_EMAIL_DOMAIN = 'unityfellowshipchurch.org.za';

type TenantRole = 'CHURCH_ADMIN' | 'STAFF' | 'CALL_CENTER' | 'SUBSCRIBER' | 'MEMBER';

const ROLE_CONFIG: Record<TenantRole, {
  label: string;
  description: string;
  color: string;
  Icon: React.ElementType;
}> = {
  CHURCH_ADMIN: {
    label: 'Church Admin',
    description: 'Full access within this tenant',
    color: 'bg-primary/10 text-primary',
    Icon: UserCog,
  },
  STAFF: {
    label: 'Staff',
    description: 'Limited tenant access',
    color: 'bg-info/10 text-info',
    Icon: User,
  },
  CALL_CENTER: {
    label: 'Call Center',
    description: 'Call center operations',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    Icon: Phone,
  },
  SUBSCRIBER: {
    label: 'Subscriber',
    description: 'Read-only access',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    Icon: Users,
  },
  MEMBER: {
    label: 'Member',
    description: 'Basic member access',
    color: 'bg-muted text-muted-foreground',
    Icon: Users,
  },
};

// ─── Password Utilities ───────────────────────────────────────────────────────

function generatePassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

// ─── User Entry Types ─────────────────────────────────────────────────────────

interface UserEntry {
  id: string; // local key only
  role: TenantRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  showPassword: boolean;
  passwordCopied: boolean;
}

function createUserEntry(role: TenantRole): UserEntry {
  return {
    id: Math.random().toString(36).slice(2),
    role,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: generatePassword(),
    showPassword: false,
    passwordCopied: false,
  };
}

// ─── User Row Component ───────────────────────────────────────────────────────

interface UserRowProps {
  entry: UserEntry;
  isFixed?: boolean; // Can't delete (Church Admin primary)
  errors: Record<string, string>;
  onUpdate: (id: string, field: keyof UserEntry, value: unknown) => void;
  onRemove: (id: string) => void;
  index: number;
}

function UserRow({ entry, isFixed, errors, onUpdate, onRemove, index }: UserRowProps) {
  const roleConfig = ROLE_CONFIG[entry.role];
  const RoleIcon = roleConfig.Icon;

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(entry.password);
      onUpdate(entry.id, 'passwordCopied', true);
      toast.success('Password copied to clipboard');
      setTimeout(() => onUpdate(entry.id, 'passwordCopied', false), 2000);
    } catch {
      toast.error('Failed to copy password');
    }
  };

  const prefix = `user_${entry.id}`;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-4 transition-colors',
        isFixed
          ? 'border-primary/30 bg-primary/10'
          : 'border-border bg-card'
      )}
    >
      {/* Row Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-1.5 rounded-md',
              isFixed
                ? 'bg-primary/10'
                : 'bg-muted'
            )}
          >
            <RoleIcon
              className={cn(
                'h-4 w-4',
                isFixed
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            />
          </div>
          {isFixed ? (
            <div>
              <p className="text-sm font-semibold">Church Admin</p>
              <p className="text-xs text-muted-foreground">Primary tenant administrator</p>
            </div>
          ) : (
            <select
              value={entry.role}
              onChange={(e) => onUpdate(entry.id, 'role', e.target.value as TenantRole)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="STAFF">Staff</option>
              <option value="CALL_CENTER">Call Center</option>
              <option value="SUBSCRIBER">Subscriber</option>
              <option value="MEMBER">Member</option>
            </select>
          )}
          <Badge className={cn('text-xs', roleConfig.color)}>
            {roleConfig.label}
          </Badge>
        </div>

        {!isFixed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(entry.id)}
            title="Remove this user" aria-label="Remove this user">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Name Row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}_firstName`} className="text-xs">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}_firstName`}
            value={entry.firstName}
            onChange={(e) => onUpdate(entry.id, 'firstName', e.target.value)}
            placeholder="First name"
            className="h-9"
          />
          {errors[`${prefix}_firstName`] && (
            <p className="text-xs text-destructive">{errors[`${prefix}_firstName`]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}_lastName`} className="text-xs">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}_lastName`}
            value={entry.lastName}
            onChange={(e) => onUpdate(entry.id, 'lastName', e.target.value)}
            placeholder="Last name"
            className="h-9"
          />
          {errors[`${prefix}_lastName`] && (
            <p className="text-xs text-destructive">{errors[`${prefix}_lastName`]}</p>
          )}
        </div>
      </div>

      {/* Email & Phone Row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}_email`} className="text-xs">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}_email`}
            type="email"
            value={entry.email}
            onChange={(e) => onUpdate(entry.id, 'email', e.target.value)}
            placeholder={isFixed ? `info@${DEFAULT_EMAIL_DOMAIN}` : 'user@example.com'}
            className="h-9"
          />
          {errors[`${prefix}_email`] && (
            <p className="text-xs text-destructive">{errors[`${prefix}_email`]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}_phone`} className="text-xs">
            Phone
          </Label>
          <Input
            id={`${prefix}_phone`}
            type="tel"
            value={entry.phone}
            onChange={(e) => onUpdate(entry.id, 'phone', e.target.value)}
            placeholder="+27 12 345 6789"
            className="h-9"
          />
        </div>
      </div>

      {/* Password Row */}
      <div className="space-y-1.5">
        <Label htmlFor={`${prefix}_password`} className="text-xs">
          Password <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id={`${prefix}_password`}
              type={entry.showPassword ? 'text' : 'password'}
              value={entry.password}
              onChange={(e) => onUpdate(entry.id, 'password', e.target.value)}
              className="font-mono pr-10 h-9 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onUpdate(entry.id, 'showPassword', !entry.showPassword)}
              aria-label={entry.showPassword ? 'Hide password' : 'Show password'}
            >
              {entry.showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onUpdate(entry.id, 'password', generatePassword())}
            title="Generate new password" aria-label="Generate new password">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleCopyPassword}
            title="Copy password" aria-label="Copy password">
            {entry.passwordCopied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {errors[`${prefix}_password`] && (
          <p className="text-xs text-destructive">{errors[`${prefix}_password`]}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type CreatedUserResult = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: TenantRole;
};

export default function NewTenantPage() {
  const router = useRouter();
  const createTenant = useCreateTenant();
  const { data: tenantsData } = useTenants({ limit: 100 });
  const hqTenants = tenantsData?.data?.filter((t) => t.isHQ) ?? [];

  // Tenant form data
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'South Africa',
    timezone: 'Africa/Johannesburg',
    isHQ: true,
    parentId: '',
    isActive: true,
  });

  // Users to create
  const [createUsers, setCreateUsers] = useState(true);
  const [users, setUsers] = useState<UserEntry[]>([createUserEntry('CHURCH_ADMIN')]);

  // Success state
  const [createdResults, setCreatedResults] = useState<{
    tenantName: string;
    users: CreatedUserResult[];
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Tenant Form Handlers ────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'name') {
      setFormData((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ── User Row Handlers ───────────────────────────────────────────────────

  const handleUpdateUser = useCallback(
    (id: string, field: keyof UserEntry, value: unknown) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, [field]: value } : u))
      );
      // Clear related error
      const prefix = `user_${id}`;
      const errorKey = `${prefix}_${String(field)}`;
      if (errors[errorKey]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[errorKey];
          return next;
        });
      }
    },
    [errors]
  );

  const handleRemoveUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const handleAddUser = (role: TenantRole) => {
    setUsers((prev) => [...prev, createUserEntry(role)]);
  };

  // ── Validation ──────────────────────────────────────────────────────────

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.isHQ && !formData.parentId) {
      newErrors.parentId = 'Parent organization is required for branches';
    }

    if (createUsers) {
      const emailsSeen = new Set<string>();

      users.forEach((u) => {
        const prefix = `user_${u.id}`;

        if (!u.firstName.trim()) newErrors[`${prefix}_firstName`] = 'First name is required';
        if (!u.lastName.trim()) newErrors[`${prefix}_lastName`] = 'Last name is required';

        if (!u.email.trim()) {
          newErrors[`${prefix}_email`] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) {
          newErrors[`${prefix}_email`] = 'Invalid email format';
        } else if (emailsSeen.has(u.email.toLowerCase())) {
          newErrors[`${prefix}_email`] = 'Duplicate email address';
        } else {
          emailsSeen.add(u.email.toLowerCase());
        }

        if (!u.password || u.password.length < 8) {
          newErrors[`${prefix}_password`] = 'Password must be at least 8 characters';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Separate Church Admin from additional users
      const churchAdminEntry = createUsers
        ? users.find((u) => u.role === 'CHURCH_ADMIN') ?? null
        : null;
      const additionalEntries = createUsers
        ? users.filter((u) => u.role !== 'CHURCH_ADMIN')
        : [];

      await createTenant.mutateAsync({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country,
        timezone: formData.timezone,
        isHQ: formData.isHQ,
        parentId: formData.isHQ ? undefined : formData.parentId || undefined,
        adminUser: churchAdminEntry
          ? {
              firstName: churchAdminEntry.firstName,
              lastName: churchAdminEntry.lastName,
              email: churchAdminEntry.email,
              password: churchAdminEntry.password,
              phone: churchAdminEntry.phone || undefined,
            }
          : undefined,
        additionalUsers:
          additionalEntries.length > 0
            ? additionalEntries.map((u) => ({
                role: u.role,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                password: u.password,
                phone: u.phone || undefined,
              }))
            : undefined,
      });

      if (createUsers && users.length > 0) {
        setCreatedResults({
          tenantName: formData.name,
          users: users.map((u) => ({
            email: u.email,
            password: u.password,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
          })),
        });
      } else {
        router.push('/super-admin/tenants');
      }
    } catch {
      // Error handled by mutation
    }
  };

  // ─── Success Screen ────────────────────────────────────────────────────

  if (createdResults) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Tenant Created Successfully
          </h1>
          <p className="text-muted-foreground mt-1">
            Share these credentials with each user. Passwords are shown only once.
          </p>
        </div>

        <Card className="border-success/30">
          <CardHeader className="bg-success/10 pb-4">
            <CardTitle className="text-success flex items-center gap-2">
              <Check className="h-5 w-5" />
              {createdResults.tenantName} — {createdResults.users.length} user
              {createdResults.users.length !== 1 ? 's' : ''} created
            </CardTitle>
            <CardDescription className="text-success">
              All users must change their password on first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {createdResults.users.map((u, i) => {
              const roleConfig = ROLE_CONFIG[u.role];
              const RoleIcon = roleConfig.Icon;

              return (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  {/* User Header */}
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {u.firstName} {u.lastName}
                    </span>
                    <Badge className={cn('text-xs', roleConfig.color)}>
                      {roleConfig.label}
                    </Badge>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={u.email}
                        readOnly
                        className="font-mono bg-muted h-9 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => navigator.clipboard.writeText(u.email)} aria-label="Copy">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Temporary Password
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={u.password}
                        readOnly
                        className="font-mono bg-muted h-9 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => navigator.clipboard.writeText(u.password)} aria-label="Copy">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                These passwords will not be shown again. Share them securely with each user.
              </p>
            </div>

            <div className="pt-2 border-t">
              <Button onClick={() => router.push('/super-admin/tenants')}>
                Continue to Churches List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/super-admin/tenants">
          <Button variant="ghost" size="icon" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create New Tenant
          </h1>
          <p className="text-muted-foreground">
            Add a new church organization to the platform
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Organization Details ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Basic information about the church organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Grace Community Church"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g., grace-community-church"
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier (auto-generated from name)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the organization"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@church.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+27 12 345 6789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://church.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Location ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Address and location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Province</Label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select Province</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="North West">North West</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="Western Cape">Western Cape</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal/ZIP Code</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="South Africa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ── Organization Type ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Type</CardTitle>
            <CardDescription>
              Configure whether this is a headquarters or branch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isHQ"
                name="isHQ"
                checked={formData.isHQ}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isHQ" className="font-normal">
                This is a Headquarters (HQ) organization
              </Label>
            </div>

            {!formData.isHQ && (
              <div className="space-y-2">
                <Label htmlFor="parentId">
                  Parent Organization <span className="text-destructive">*</span>
                </Label>
                <select
                  id="parentId"
                  name="parentId"
                  value={formData.parentId}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select parent organization</option>
                  {hqTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
                {errors.parentId && (
                  <p className="text-sm text-destructive">{errors.parentId}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isActive" className="font-normal">
                Organization is active
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* ── Initial Users ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Initial User Accounts
                </CardTitle>
                <CardDescription className="mt-1">
                  Create user accounts for this tenant. All users will be prompted to change
                  their password on first login.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input
                  type="checkbox"
                  id="createUsers"
                  checked={createUsers}
                  onChange={(e) => setCreateUsers(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="createUsers" className="font-normal text-sm whitespace-nowrap">
                  Create users now
                </Label>
              </div>
            </div>
          </CardHeader>

          {createUsers && (
            <CardContent className="space-y-4">
              {/* Role summary pills */}
              <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg">
                <span className="text-xs text-muted-foreground self-center">
                  Users to create:
                </span>
                {users.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role];
                  return (
                    <Badge key={u.id} className={cn('text-xs', roleConfig.color)}>
                      {roleConfig.label}
                    </Badge>
                  );
                })}
              </div>

              {/* User rows */}
              <div className="space-y-4">
                {users.map((u, i) => (
                  <UserRow
                    key={u.id}
                    entry={u}
                    isFixed={u.role === 'CHURCH_ADMIN' && i === 0}
                    errors={errors}
                    onUpdate={handleUpdateUser}
                    onRemove={handleRemoveUser}
                    index={i}
                  />
                ))}
              </div>

              {/* Add user buttons */}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Add another user
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'CHURCH_ADMIN',
                      'STAFF',
                      'CALL_CENTER',
                      'SUBSCRIBER',
                      'MEMBER',
                    ] as TenantRole[]
                  ).map((role) => {
                    const roleConfig = ROLE_CONFIG[role];
                    const RoleIcon = roleConfig.Icon;
                    return (
                      <Button
                        key={role}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUser(role)}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  Save or copy all passwords before submitting — they will be shown once more
                  after creation but cannot be retrieved later.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/super-admin/tenants">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createTenant.isPending}>
            {createTenant.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Tenant
              </>
            )}
          </Button>
        </div>

        {createTenant.isError && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {createTenant.error?.message || 'Failed to create tenant. Please try again.'}
          </div>
        )}
      </form>
    </div>
  );
}
