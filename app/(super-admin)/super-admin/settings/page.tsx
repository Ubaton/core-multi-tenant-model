/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN SETTINGS PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Settings, 
  Bell, 
  Shield, 
  Database,
  Mail,
  Server,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Palette,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSettings, useUpdateSettings, type SystemSettings } from '@/lib/client/hooks/use-settings';
import type { UpdateSystemSettingsInput } from '@/lib/validations';
import { useTheme } from '@/context/theme-context';

const settingsTabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system', label: 'System', icon: Server },
] as const;

type SettingsTab = typeof settingsTabs[number]['id'];

export default function SuperAdminSettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [formData, setFormData] = useState<Partial<UpdateSystemSettingsInput>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme } = useTheme();

  // Populate form when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        platformName: settings.platformName,
        platformDescription: settings.platformDescription ?? '',
        supportEmail: settings.supportEmail ?? '',
        supportPhone: settings.supportPhone ?? '',
        defaultTimezone: settings.defaultTimezone,
        smtpHost: settings.smtpHost ?? '',
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser ?? '',
        smtpFromEmail: settings.smtpFromEmail ?? '',
        smtpFromName: settings.smtpFromName ?? '',
        smtpSecure: settings.smtpSecure,
        notifyNewTenant: settings.notifyNewTenant,
        notifySystemErrors: settings.notifySystemErrors,
        notifyDailySummary: settings.notifyDailySummary,
        notifySecurityAlerts: settings.notifySecurityAlerts,
        sessionTimeoutMins: settings.sessionTimeoutMins,
        maxLoginAttempts: settings.maxLoginAttempts,
        lockoutDurationMins: settings.lockoutDurationMins,
        passwordMinLength: settings.passwordMinLength,
        requireUppercase: settings.requireUppercase,
        requireNumber: settings.requireNumber,
        requireSpecialChar: settings.requireSpecialChar,
        require2FA: settings.require2FA,
      });
    }
  }, [settings]);

  // Allow deep-linking to a settings tab via ?tab=
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;
    const validTabs = new Set(settingsTabs.map((t) => t.id));
    if (validTabs.has(tab as SettingsTab)) {
      setActiveTab(tab as SettingsTab);
    }
  }, [searchParams]);

  const handleInputChange = (field: keyof UpdateSystemSettingsInput, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (section: string) => {
    try {
      await updateSettings.mutateAsync(formData);
      setSaveSuccess(section);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure global platform settings and preferences
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
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic platform configuration and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input 
                    id="platformName" 
                    value={formData.platformName || ''} 
                    onChange={(e) => handleInputChange('platformName', e.target.value)}
                    placeholder="Enter platform name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformDescription">Platform Description</Label>
                  <Textarea 
                    id="platformDescription" 
                    value={formData.platformDescription || ''}
                    onChange={(e) => handleInputChange('platformDescription', e.target.value)}
                    placeholder="Enter platform description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input 
                      id="supportEmail" 
                      type="email" 
                      value={formData.supportEmail || ''}
                      onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                      placeholder="support@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportPhone">Support Phone</Label>
                    <Input 
                      id="supportPhone" 
                      type="tel" 
                      value={formData.supportPhone || ''}
                      onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <select
                    id="timezone"
                    value={formData.defaultTimezone || 'Africa/Johannesburg'}
                    onChange={(e) => handleInputChange('defaultTimezone', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="Africa/Johannesburg">Africa/Johannesburg (WAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                  </select>
                </div>
                <div className="flex justify-end items-center gap-3">
                  {saveSuccess === 'general' && (
                    <span className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Saved successfully
                    </span>
                  )}
                  <Button 
                    onClick={() => handleSave('general')}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
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

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred color scheme for the dashboard
                    </p>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Light Theme */}
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-primary/50",
                        theme === 'light' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                        <Sun className="h-8 w-8 text-amber-500" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Light</p>
                        <p className="text-xs text-muted-foreground">Bright and clean</p>
                      </div>
                      {theme === 'light' && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>

                    {/* Dark Theme */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-primary/50",
                        theme === 'dark' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center">
                        <Moon className="h-8 w-8 text-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Dark</p>
                        <p className="text-xs text-muted-foreground">Easy on the eyes</p>
                      </div>
                      {theme === 'dark' && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>

                    {/* System Theme */}
                    <button
                      onClick={() => setTheme('system')}
                      className={cn(
                        "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-primary/50",
                        theme === 'system' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="h-16 w-16 rounded-full bg-linear-to-br from-amber-100 to-slate-800 flex items-center justify-center">
                        <Monitor className="h-8 w-8 text-gray-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">System</p>
                        <p className="text-xs text-muted-foreground">Match device settings</p>
                      </div>
                      {theme === 'system' && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="text-base font-medium">Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      See how your dashboard looks with the selected theme
                    </p>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Palette className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Sample Card</p>
                          <p className="text-sm text-muted-foreground">With muted text</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Active
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          Info
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Statistics Preview</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-foreground">Members</span>
                          <span className="font-semibold">1,234</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground">Active</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">98%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Theme preferences are saved locally in your browser and will persist across sessions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'email' && (
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure SMTP settings for outgoing emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input 
                      id="smtpHost" 
                      value={formData.smtpHost || ''}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input 
                      id="smtpPort" 
                      type="number"
                      value={formData.smtpPort || 587}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value) || 587)}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input 
                      id="smtpUser" 
                      value={formData.smtpUser || ''}
                      onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPass">SMTP Password</Label>
                    <Input 
                      id="smtpPass" 
                      type="password"
                      value={formData.smtpPass || ''}
                      onChange={(e) => handleInputChange('smtpPass', e.target.value)}
                      placeholder={settings?.hasSmtpPassword ? '••••••••' : 'Enter password'}
                    />
                    {settings?.hasSmtpPassword && (
                      <p className="text-xs text-muted-foreground">Leave empty to keep current password</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input 
                    id="smtpFromEmail" 
                    type="email"
                    value={formData.smtpFromEmail || ''}
                    onChange={(e) => handleInputChange('smtpFromEmail', e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input 
                    id="smtpFromName" 
                    value={formData.smtpFromName || ''}
                    onChange={(e) => handleInputChange('smtpFromName', e.target.value)}
                    placeholder="Your Platform Name"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={formData.smtpSecure ?? true}
                    onChange={(e) => handleInputChange('smtpSecure', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="smtpSecure" className="font-normal">
                    Use TLS/SSL
                  </Label>
                </div>
                <div className="flex justify-end items-center gap-3">
                  {saveSuccess === 'email' && (
                    <span className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Saved successfully
                    </span>
                  )}
                  <Button variant="outline">
                    Test Connection
                  </Button>
                  <Button 
                    onClick={() => handleSave('email')}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
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
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure platform-wide notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Tenant Registration</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when a new tenant is created
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formData.notifyNewTenant ?? true} 
                      onChange={(e) => handleInputChange('notifyNewTenant', e.target.checked)}
                      className="h-4 w-4" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">System Errors</p>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts for critical system errors
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formData.notifySystemErrors ?? true} 
                      onChange={(e) => handleInputChange('notifySystemErrors', e.target.checked)}
                      className="h-4 w-4" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Daily Summary</p>
                      <p className="text-sm text-muted-foreground">
                        Receive daily platform activity summary
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formData.notifyDailySummary ?? false} 
                      onChange={(e) => handleInputChange('notifyDailySummary', e.target.checked)}
                      className="h-4 w-4" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Security Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified of suspicious activities
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formData.notifySecurityAlerts ?? true} 
                      onChange={(e) => handleInputChange('notifySecurityAlerts', e.target.checked)}
                      className="h-4 w-4" 
                    />
                  </div>
                </div>
                <div className="flex justify-end items-center gap-3">
                  {saveSuccess === 'notifications' && (
                    <span className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Saved successfully
                    </span>
                  )}
                  <Button 
                    onClick={() => handleSave('notifications')}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
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
                  Configure platform security policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="sessionTimeout" 
                      type="number"
                      value={formData.sessionTimeoutMins || 60}
                      onChange={(e) => handleInputChange('sessionTimeoutMins', parseInt(e.target.value) || 60)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input 
                      id="maxLoginAttempts" 
                      type="number"
                      value={formData.maxLoginAttempts || 5}
                      onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                    <Input 
                      id="lockoutDuration" 
                      type="number"
                      value={formData.lockoutDurationMins || 15}
                      onChange={(e) => handleInputChange('lockoutDurationMins', parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input 
                      id="passwordMinLength" 
                      type="number"
                      value={formData.passwordMinLength || 8}
                      onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value) || 8)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requireUppercase"
                      checked={formData.requireUppercase ?? true}
                      onChange={(e) => handleInputChange('requireUppercase', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="requireUppercase" className="font-normal">
                      Require uppercase letter in password
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requireNumber"
                      checked={formData.requireNumber ?? true}
                      onChange={(e) => handleInputChange('requireNumber', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="requireNumber" className="font-normal">
                      Require number in password
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requireSpecial"
                      checked={formData.requireSpecialChar ?? true}
                      onChange={(e) => handleInputChange('requireSpecialChar', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="requireSpecial" className="font-normal">
                      Require special character in password
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enable2FA"
                      checked={formData.require2FA ?? false}
                      onChange={(e) => handleInputChange('require2FA', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="enable2FA" className="font-normal">
                      Require two-factor authentication for admins
                    </Label>
                  </div>
                </div>
                <div className="flex justify-end items-center gap-3">
                  {saveSuccess === 'security' && (
                    <span className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Saved successfully
                    </span>
                  )}
                  <Button 
                    onClick={() => handleSave('security')}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'system' && (
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  View system status and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Application Version</p>
                    <p className="text-lg font-semibold">1.0.0</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Node.js Version</p>
                    <p className="text-lg font-semibold">{typeof window === 'undefined' ? process.version : 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Next.js Version</p>
                    <p className="text-lg font-semibold">16.1.1</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Database</p>
                    <p className="text-lg font-semibold">PostgreSQL</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Maintenance</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline">
                      <Database className="mr-2 h-4 w-4" />
                      Clear Cache
                    </Button>
                    <Button variant="outline">
                      <Server className="mr-2 h-4 w-4" />
                      Health Check
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> System settings are read-only in this interface. 
                    For environment configuration changes, please update the environment variables directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
