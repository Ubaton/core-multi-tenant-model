/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN SETTINGS PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { 
  Settings, 
  Globe, 
  Bell, 
  Shield, 
  Database,
  Mail,
  Server,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system', label: 'System', icon: Server },
] as const;

type SettingsTab = typeof settingsTabs[number]['id'];

export default function SuperAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
                    defaultValue="ChurchHub" 
                    placeholder="Enter platform name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformDescription">Platform Description</Label>
                  <Textarea 
                    id="platformDescription" 
                    defaultValue="Multi-Tenant Church Management System"
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
                      defaultValue="support@churchhub.com"
                      placeholder="support@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportPhone">Support Phone</Label>
                    <Input 
                      id="supportPhone" 
                      type="tel" 
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <select
                    id="timezone"
                    defaultValue="Africa/Lagos"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
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
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input 
                      id="smtpPort" 
                      type="number"
                      defaultValue="587"
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input 
                      id="smtpUser" 
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPass">SMTP Password</Label>
                    <Input 
                      id="smtpPass" 
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input 
                    id="fromEmail" 
                    type="email"
                    placeholder="noreply@churchhub.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input 
                    id="fromName" 
                    placeholder="ChurchHub"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="smtpSecure" className="font-normal">
                    Use TLS/SSL
                  </Label>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline">
                    Test Connection
                  </Button>
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
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
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">System Errors</p>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts for critical system errors
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Daily Summary</p>
                      <p className="text-sm text-muted-foreground">
                        Receive daily platform activity summary
                      </p>
                    </div>
                    <input type="checkbox" className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Security Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified of suspicious activities
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>
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
                      defaultValue="60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input 
                      id="maxLoginAttempts" 
                      type="number"
                      defaultValue="5"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                    <Input 
                      id="lockoutDuration" 
                      type="number"
                      defaultValue="15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input 
                      id="passwordMinLength" 
                      type="number"
                      defaultValue="8"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requireUppercase"
                      defaultChecked
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
                      defaultChecked
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
                      defaultChecked
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
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="enable2FA" className="font-normal">
                      Require two-factor authentication for admins
                    </Label>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
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
