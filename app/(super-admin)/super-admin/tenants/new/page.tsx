/**
 * ════════════════════════════════════════════════════════════════════════════
 * CREATE TENANT PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, UserPlus, RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateTenant, useTenants } from '@/lib/client';
import { toast } from 'sonner';

// Default email domain as required
const DEFAULT_EMAIL_DOMAIN = 'unityfellowship.org.za';

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

export default function NewTenantPage() {
  const router = useRouter();
  const createTenant = useCreateTenant();
  const { data: tenantsData } = useTenants({ limit: 100 });
  
  const hqTenants = tenantsData?.data?.filter(t => t.isHQ) ?? [];

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

  // Admin user state
  const [createAdminUser, setCreateAdminUser] = useState(true);
  const [adminUser, setAdminUser] = useState({
    firstName: '',
    lastName: '',
    email: `info@${DEFAULT_EMAIL_DOMAIN}`,
    phone: '',
    password: generatePassword(),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Success state to show credentials after creation
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    tenantName: string;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Auto-generate slug from name
    if (name === 'name') {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    }

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
    if (errors[`admin_${name}`]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[`admin_${name}`];
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

    // Validate admin user fields if creating admin
    if (createAdminUser) {
      if (!adminUser.firstName.trim()) {
        newErrors.admin_firstName = 'Admin first name is required';
      }
      if (!adminUser.lastName.trim()) {
        newErrors.admin_lastName = 'Admin last name is required';
      }
      if (!adminUser.email.trim()) {
        newErrors.admin_email = 'Admin email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminUser.email)) {
        newErrors.admin_email = 'Invalid email format';
      }
      if (!adminUser.password || adminUser.password.length < 8) {
        newErrors.admin_password = 'Password must be at least 8 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await createTenant.mutateAsync({
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
        // Include admin user if checkbox is checked
        adminUser: createAdminUser ? {
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          email: adminUser.email,
          password: adminUser.password,
          phone: adminUser.phone || undefined,
        } : undefined,
      });

      // If admin user was created, show credentials modal
      if (createAdminUser && result.adminUser) {
        setCreatedCredentials({
          email: adminUser.email,
          password: adminUser.password,
          tenantName: formData.name,
        });
      } else {
        router.push('/super-admin/tenants');
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // If credentials were just created, show success modal
  if (createdCredentials) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tenant Created Successfully
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Share these credentials with the tenant administrator
            </p>
          </div>
        </div>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Admin Account Created for {createdCredentials.tenantName}
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              The following credentials have been generated. Make sure to securely share these with the tenant.
              The user will be required to change their password on first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email (Login Identifier)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={createdCredentials.email} 
                  readOnly 
                  className="font-mono bg-gray-50 dark:bg-gray-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(createdCredentials.email)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="text"
                  value={createdCredentials.password} 
                  readOnly 
                  className="font-mono bg-gray-50 dark:bg-gray-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(createdCredentials.password)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ This password will not be shown again. Make sure to copy and share it securely.
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={() => router.push('/super-admin/tenants')}>
                Continue to Tenants List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/super-admin/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create New Tenant
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Add a new church organization to the platform
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
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Grace Community Church"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g., grace-community-church"
                />
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug}</p>
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
                  <p className="text-sm text-red-500">{errors.email}</p>
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
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isHQ" className="font-normal">
                This is a Headquarters (HQ) organization
              </Label>
            </div>

            {!formData.isHQ && (
              <div className="space-y-2">
                <Label htmlFor="parentId">
                  Parent Organization <span className="text-red-500">*</span>
                </Label>
                <select
                  id="parentId"
                  name="parentId"
                  value={formData.parentId}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select parent organization</option>
                  {hqTenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
                {errors.parentId && (
                  <p className="text-sm text-red-500">{errors.parentId}</p>
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
                className="h-4 w-4 rounded border-gray-300"
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
              Create an administrator account for this tenant. They will be required to change their password on first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="createAdminUser"
                checked={createAdminUser}
                onChange={(e) => setCreateAdminUser(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="createAdminUser" className="font-normal">
                Create admin user account for this tenant
              </Label>
            </div>

            {createAdminUser && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="admin_firstName"
                      name="firstName"
                      value={adminUser.firstName}
                      onChange={handleAdminChange}
                      placeholder="Enter first name"
                    />
                    {errors.admin_firstName && (
                      <p className="text-sm text-red-500">{errors.admin_firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="admin_lastName"
                      name="lastName"
                      value={adminUser.lastName}
                      onChange={handleAdminChange}
                      placeholder="Enter last name"
                    />
                    {errors.admin_lastName && (
                      <p className="text-sm text-red-500">{errors.admin_lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">
                      Email (Login Identifier) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="admin_email"
                      name="email"
                      type="email"
                      value={adminUser.email}
                      onChange={handleAdminChange}
                      placeholder={`info@${DEFAULT_EMAIL_DOMAIN}`}
                    />
                    {errors.admin_email && (
                      <p className="text-sm text-red-500">{errors.admin_email}</p>
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
                    Generated Password <span className="text-red-500">*</span>
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
                      title="Generate new password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPassword}
                      title="Copy password"
                    >
                      {passwordCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.admin_password && (
                    <p className="text-sm text-red-500">{errors.admin_password}</p>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Save this password before submitting. It will be shown once more after creation for you to share with the tenant.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
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
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
            {createTenant.error?.message || 'Failed to create tenant. Please try again.'}
          </div>
        )}
      </form>
    </div>
  );
}
