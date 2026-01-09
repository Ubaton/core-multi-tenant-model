/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT SETTINGS PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser, useUpdateProfile, useChangePassword, useTenantProfile, useUpdateTenantProfile, useModulePermissions } from '@/lib/client';
import { useTheme } from '@/context';
import { cn } from '@/lib/utils';
import { AccessDenied } from '@/components/permission-gate';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const;

type SettingsTab = typeof settingsTabs[number]['id'];

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={cn(
      "fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg z-50",
      type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { data: user } = useCurrentUser();
  const { data: tenant } = useTenantProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { canView, isLoading: permissionsLoading } = useModulePermissions();
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    timezone: '',
    phone: '',
    email: '',
    website: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    newMemberAlerts: true,
    prayerRequestUpdates: false,
    offeringReports: true,
  });

  // Initialize profile form when user data loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Initialize organization form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setOrgForm({
        name: tenant.name || '',
        description: tenant.description || '',
        address: tenant.address || '',
        city: tenant.city || '',
        state: tenant.state || '',
        postalCode: tenant.postalCode || '',
        country: tenant.country || '',
        timezone: tenant.timezone || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
      });
    }
  }, [tenant]);

  // Allow deep-linking to a settings tab via ?tab=
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;
    const validTabs = new Set(settingsTabs.map((t) => t.id));
    if (validTabs.has(tab as SettingsTab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  // Mutations
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updateTenantProfile = useUpdateTenantProfile();

  // Handle profile save
  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        phone: profileForm.phone || null,
      });
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Failed to update profile', type: 'error' });
    }
  };

  // Handle organization save
  const handleSaveOrganization = async () => {
    try {
      await updateTenantProfile.mutateAsync({
        name: orgForm.name,
        description: orgForm.description || undefined,
        address: orgForm.address || undefined,
        city: orgForm.city || undefined,
        state: orgForm.state || undefined,
        postalCode: orgForm.postalCode || undefined,
        country: orgForm.country || undefined,
        timezone: orgForm.timezone || undefined,
        phone: orgForm.phone || undefined,
        email: orgForm.email || undefined,
        website: orgForm.website || undefined,
      });
      setToast({ message: 'Organization updated successfully', type: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Failed to update organization', type: 'error' });
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ message: 'New passwords do not match', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setToast({ message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToast({ message: 'Password changed successfully', type: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Failed to change password', type: 'error' });
    }
  };

  // Handle notification preferences save
  const handleSaveNotifications = async () => {
    // TODO: Implement notification preferences API
    setToast({ message: 'Notification preferences saved', type: 'success' });
  };

  // Check for view permission
  if (!permissionsLoading && !canView('settings')) {
    return <AccessDenied message="You do not have permission to view settings." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:w-48 lg:shrink-0">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your personal information and profile details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'organization' && (
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Manage your church or organization details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input 
                    id="orgName" 
                    value={orgForm.name}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgDescription">Description</Label>
                  <Textarea 
                    id="orgDescription" 
                    value={orgForm.description}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of your organization"
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgPhone">Phone</Label>
                    <Input 
                      id="orgPhone" 
                      type="tel" 
                      value={orgForm.phone}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgEmail">Email</Label>
                    <Input 
                      id="orgEmail" 
                      type="email" 
                      value={orgForm.email}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgWebsite">Website</Label>
                  <Input 
                    id="orgWebsite" 
                    type="url" 
                    value={orgForm.website}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourchurch.com"
                  />
                </div>

                {/* Location Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">Location Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgAddress">Street Address</Label>
                      <Textarea 
                        id="orgAddress" 
                        value={orgForm.address}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter street address"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="orgCity">City</Label>
                        <Input 
                          id="orgCity" 
                          value={orgForm.city}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter city"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgState">Province</Label>
                        <select
                          id="orgState"
                          value={orgForm.state}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, state: e.target.value }))}
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
                        <Label htmlFor="orgPostalCode">Postal Code</Label>
                        <Input 
                          id="orgPostalCode" 
                          value={orgForm.postalCode}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="0001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgCountry">Country</Label>
                        <Input 
                          id="orgCountry" 
                          value={orgForm.country}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="South Africa"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgTimezone">Timezone</Label>
                      <select
                        id="orgTimezone"
                        value={orgForm.timezone}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select Timezone</option>
                        <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                        <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="America/New_York">America/New_York (EST/EDT)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveOrganization} disabled={updateTenantProfile.isPending}>
                    {updateTenantProfile.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about activity
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.emailNotifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      className="h-4 w-4" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Member Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when new members join
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.newMemberAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, newMemberAlerts: e.target.checked }))}
                      className="h-4 w-4" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Prayer Request Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates on prayer requests
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.prayerRequestUpdates}
                      onChange={(e) => setNotifications(prev => ({ ...prev, prayerRequestUpdates: e.target.checked }))}
                      className="h-4 w-4" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Offering Reports</p>
                      <p className="text-sm text-muted-foreground">
                        Weekly and monthly offering summaries
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.offeringReports}
                      onChange={(e) => setNotifications(prev => ({ ...prev, offeringReports: e.target.checked }))}
                      className="h-4 w-4" 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password and account security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, and a number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={changePassword.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    {changePassword.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <AppearanceTab />
          )}
        </div>
      </div>
    </div>
  );
}

// Separate component for Appearance to use useTheme
function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-3">Theme</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setTheme('light')}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors",
                  theme === 'light' ? "border-primary" : "border-muted hover:border-muted-foreground/50"
                )}
              >
                <div className="w-16 h-10 rounded bg-white border shadow-sm"></div>
                <span className="text-sm">Light</span>
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors",
                  theme === 'dark' ? "border-primary" : "border-muted hover:border-muted-foreground/50"
                )}
              >
                <div className="w-16 h-10 rounded bg-gray-900 border border-gray-700"></div>
                <span className="text-sm">Dark</span>
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors",
                  theme === 'system' ? "border-primary" : "border-muted hover:border-muted-foreground/50"
                )}
              >
                <div className="w-16 h-10 rounded overflow-hidden border flex">
                  <div className="w-1/2 bg-white"></div>
                  <div className="w-1/2 bg-gray-900"></div>
                </div>
                <span className="text-sm">System</span>
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {theme === 'system' 
                ? "Theme will automatically match your system preferences." 
                : `${theme.charAt(0).toUpperCase() + theme.slice(1)} mode is currently active.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
