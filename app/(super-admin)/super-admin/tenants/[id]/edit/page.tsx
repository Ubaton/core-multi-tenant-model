/**
 * ════════════════════════════════════════════════════════════════════════════
 * EDIT TENANT PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Loader2, UserPlus, RefreshCw, Eye, EyeOff, Copy, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant, useUpdateTenant, useTenants, useTenantAdmins, useCreateTenantAdmin } from '@/lib/client';
import { toast } from 'sonner';

// Default email domain as required
const DEFAULT_EMAIL_DOMAIN = 'unityfellowshipchurch.org.za';

/**
 * Generate a secure random password
 */
function generatePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each required type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: tenant, isLoading: isLoadingTenant } = useTenant(id);
  const updateTenant = useUpdateTenant(id);
  const { data: tenantsData } = useTenants({ limit: 100 });
  const { data: adminData, isLoading: isLoadingAdmins } = useTenantAdmins(id);
  const createTenantAdmin = useCreateTenantAdmin(id);
  
  const hqTenants = tenantsData?.data?.filter(t => t.isHQ && t.id !== id) ?? [];
  const hasExistingAdmin = adminData?.hasAdmin ?? false;

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

  // Admin user state (for adding admin to existing tenant)
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState({
    firstName: '',
    lastName: '',
    email: `info@${DEFAULT_EMAIL_DOMAIN}`,
    phone: '',
    password: generatePassword(),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        slug: tenant.slug || '',
        description: tenant.description || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        website: tenant.website || '',
        address: tenant.address || '',
        city: tenant.city || '',
        state: tenant.state || '',
        postalCode: tenant.postalCode || '',
        country: tenant.country || 'South Africa',
        timezone: tenant.timezone || 'Africa/Johannesburg',
        isHQ: tenant.isHQ ?? true,
        parentId: tenant.parent?.id || '',
        isActive: tenant.isActive ?? true,
      });
    }
  }, [tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Handle admin user field changes
  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminUser(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is edited
    if (adminErrors[name]) {
      setAdminErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Generate new password
  const handleGeneratePassword = useCallback(() => {
    setAdminUser(prev => ({
      ...prev,
      password: generatePassword(),
    }));
    setPasswordCopied(false);
  }, []);

  // Copy password to clipboard
  const handleCopyPassword = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(adminUser.password);
      setPasswordCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy password');
      console.error('Failed to copy password:', err);
    }
  }, [adminUser.password]);

  // Validate admin user form
  const validateAdminForm = () => {
    const newErrors: Record<string, string> = {};

    if (!adminUser.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!adminUser.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!adminUser.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminUser.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!adminUser.password || adminUser.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setAdminErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle creating admin user
  const handleCreateAdmin = async () => {
    if (!validateAdminForm()) return;

    try {
      const result = await createTenantAdmin.mutateAsync({
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        password: adminUser.password,
        phone: adminUser.phone || undefined,
      });

      // Show created credentials
      setCreatedCredentials({
        email: adminUser.email,
        password: adminUser.password,
      });
      setShowAddAdmin(false);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await updateTenant.mutateAsync({
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
      });

      router.push(`/super-admin/tenants/${id}`);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (isLoadingTenant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-6">
        <Link href="/super-admin/tenants" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Churches
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Tenant Not Found
            </h2>
            <p className="text-muted-foreground">
              The tenant you're trying to edit doesn't exist.
            </p>
            <Link href="/super-admin/tenants" className="mt-4 inline-block">
              <Button>Return to Churches</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/super-admin/tenants/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Edit Tenant
          </h1>
          <p className="text-muted-foreground">
            Update {tenant.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
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
                  URL-friendly identifier
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
                  placeholder="+234 801 234 5678"
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

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>
              Address and location details
            </CardDescription>
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
                <option value="Africa/Johannesburg">Africa/Johannesburg (WAT)</option>
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Organization Type */}
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
                  {hqTenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
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

        {/* Admin User Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Admin User Account
            </CardTitle>
            <CardDescription>
              {hasExistingAdmin 
                ? 'This tenant already has administrator accounts.'
                : 'Create an administrator account for this tenant. They will be required to change their password on first login.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show existing admins */}
            {isLoadingAdmins ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading admin users...</span>
              </div>
            ) : hasExistingAdmin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-success">
                  <Check className="h-4 w-4" />
                  <span>This tenant has {adminData?.adminUsers.length} admin user(s)</span>
                </div>
                <div className="border rounded-lg divide-y">
                  {adminData?.adminUsers.map(admin => (
                    <div key={admin.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{admin.firstName} {admin.lastName}</p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {admin.lastLoginAt 
                          ? `Last login: ${new Date(admin.lastLoginAt).toLocaleDateString()}`
                          : 'Never logged in'
                        }
                      </div>
                    </div>
                  ))}
                </div>
                {!showAddAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddAdmin(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Another Admin
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  No admin account has been created for this tenant yet.
                </p>
                {!showAddAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddAdmin(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Admin Account
                  </Button>
                )}
              </div>
            )}

            {/* Created credentials display */}
            {createdCredentials && (
              <div className="rounded-lg border border-success/30 bg-success/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Admin Account Created Successfully</span>
                </div>
                <p className="text-sm text-success">
                  Share these credentials with the tenant. They will be required to change their password on first login.
                </p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-success">Email:</span>
                    <code className="text-sm bg-white px-2 py-1 rounded">{createdCredentials.email}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigator.clipboard.writeText(createdCredentials.email)} aria-label="Copy">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-success">Password:</span>
                    <code className="text-sm bg-white px-2 py-1 rounded">{createdCredentials.password}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigator.clipboard.writeText(createdCredentials.password)} aria-label="Copy">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreatedCredentials(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Add admin form */}
            {showAddAdmin && !createdCredentials && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_firstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="admin_firstName"
                      name="firstName"
                      value={adminUser.firstName}
                      onChange={handleAdminChange}
                      placeholder="Enter first name"
                    />
                    {adminErrors.firstName && (
                      <p className="text-sm text-destructive">{adminErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_lastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="admin_lastName"
                      name="lastName"
                      value={adminUser.lastName}
                      onChange={handleAdminChange}
                      placeholder="Enter last name"
                    />
                    {adminErrors.lastName && (
                      <p className="text-sm text-destructive">{adminErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">
                      Email (Login Identifier) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="admin_email"
                      name="email"
                      type="email"
                      value={adminUser.email}
                      onChange={handleAdminChange}
                      placeholder={`info@${DEFAULT_EMAIL_DOMAIN}`}
                    />
                    {adminErrors.email && (
                      <p className="text-sm text-destructive">{adminErrors.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Default: info@{DEFAULT_EMAIL_DOMAIN}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_phone">Phone</Label>
                    <Input
                      id="admin_phone"
                      name="phone"
                      type="tel"
                      value={adminUser.phone}
                      onChange={handleAdminChange}
                      placeholder="+27 12 345 6789"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_password">
                    Generated Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="admin_password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={adminUser.password}
                        onChange={handleAdminChange}
                        className="font-mono pr-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGeneratePassword}
                      title="Generate new password" aria-label="Generate new password">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPassword}
                      title="Copy password" aria-label="Copy password">
                      {passwordCopied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {adminErrors.password && (
                    <p className="text-sm text-destructive">{adminErrors.password}</p>
                  )}
                  <p className="text-xs text-warning">
                    ⚠️ Save this password before creating. It will be shown once more after creation for you to share with the tenant.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handleCreateAdmin}
                    disabled={createTenantAdmin.isPending}
                  >
                    {createTenantAdmin.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Admin Account
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddAdmin(false);
                      setAdminErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {createTenantAdmin.isError && (
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                    {createTenantAdmin.error?.message || 'Failed to create admin account. Please try again.'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/super-admin/tenants/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateTenant.isPending}>
            {updateTenant.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {updateTenant.isError && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {updateTenant.error?.message || 'Failed to update tenant. Please try again.'}
          </div>
        )}
      </form>
    </div>
  );
}
