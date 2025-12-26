/**
 * ════════════════════════════════════════════════════════════════════════════
 * EDIT USER PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useUpdateUser, useTenants } from '@/lib/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser(id);
  const { data: tenantsData } = useTenants({ limit: 100 });
  const updateUser = useUpdateUser();

  const tenants = tenantsData?.data ?? [];

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'MEMBER' as string,
    tenantId: '',
    isActive: true,
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        role: user.role,
        tenantId: user.tenantId || '',
        isActive: user.isActive,
        password: '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const updateData: Record<string, unknown> = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        role: formData.role,
        tenantId: formData.tenantId || null,
        isActive: formData.isActive,
      };

      // Only include password if it was changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUser.mutateAsync({ id, data: updateData });
      router.push(`/super-admin/users/${id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">User Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/super-admin/users/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit User
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Update user information for {user.firstName} {user.lastName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>
              Update the user&apos;s basic information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
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
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                New Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current password
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Role & Tenant */}
        <Card>
          <CardHeader>
            <CardTitle>Role & Organization</CardTitle>
            <CardDescription>
              Configure user access and organization assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="CHURCH_ADMIN">Church Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="CALL_CENTER">Call Center</option>
                  <option value="SUBSCRIBER">Subscriber</option>
                  <option value="MEMBER">Member</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantId">Organization</Label>
                <select
                  id="tenantId"
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">No Organization (Global)</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                User is active
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/super-admin/users/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateUser.isPending}>
            {updateUser.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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

        {updateUser.isError && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
            {updateUser.error?.message || 'Failed to update user. Please try again.'}
          </div>
        )}
      </form>
    </div>
  );
}
