/**
 * ════════════════════════════════════════════════════════════════════════════
 * COMMUNICATIONS PAGE
 * Member communications (SMS/Email/WhatsApp) + Support messaging with Admin
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Headphones,
  Inbox,
  Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCommunications, useDeleteCommunication, useModulePermissions } from '@/lib/client';
import { 
  useMessages, 
  useMessage, 
  useSendMessage, 
  useReplyToMessage,
  useUnreadMessageCount,
  type InternalMessage,
  type MessagePriority,
} from '@/lib/client/hooks/use-messages';
import { cn } from '@/lib/utils';
import { RequireCreate, AccessDenied } from '@/components/permission-gate';
import { toast } from 'sonner';

const typeIcons = {
  SMS: MessageSquare,
  EMAIL: Mail,
  WHATSAPP: Phone,
};

const typeColors: Record<string, string> = {
  SMS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  EMAIL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  WHATSAPP: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock },
  SENT: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Send },
  DELIVERED: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle },
  FAILED: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle },
};

const priorityColors: Record<MessagePriority, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

type TabType = 'messages' | 'support';

function formatMessageDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function getSenderName(message: InternalMessage) {
  const { sender } = message;
  return `${sender.firstName} ${sender.lastName}`;
}

export default function CommunicationsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const { canView, canCreate, canDelete, isLoading: permissionsLoading } = useModulePermissions();

  // Member communications state
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  // Support messaging state
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composePriority, setComposePriority] = useState<MessagePriority>('NORMAL');

  // Queries - Member communications
  const { data, isLoading } = useCommunications({
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
    page,
    pageSize: 20,
  });

  // Queries - Support messages
  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useMessages(
    { type: 'all', page: 1, pageSize: 50 },
    { refetchInterval: 10000 } // Poll every 10 seconds for real-time updates
  );
  const { data: unreadCount } = useUnreadMessageCount();
  const { data: selectedMessage, isLoading: isLoadingMessage } = useMessage(
    selectedMessageId || undefined
  );

  // Mutations
  const deleteCommunication = useDeleteCommunication();
  const sendMessage = useSendMessage();
  const replyMutation = useReplyToMessage(selectedMessageId || '');

  const communications = data?.data ?? [];
  const meta = data?.meta;
  const supportMessages = messagesData?.data ?? [];

  // Check for view permission
  if (!permissionsLoading && !canView('communications')) {
    return <AccessDenied message="You do not have permission to view communications." />;
  }

  // Handlers
  const handleSendReply = useCallback(async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        subject: `Re: ${selectedMessage.subject}`,
        message: replyText.trim(),
        priority: selectedMessage.priority,
        receiverId: selectedMessage.senderId,
      });
      toast.success('Reply sent successfully');
      setReplyText('');
    } catch (error) {
      toast.error('Failed to send reply');
      console.error('Failed to send reply:', error);
    }
  }, [selectedMessage, replyText, replyMutation]);

  const handleCompose = useCallback(async () => {
    if (!composeSubject.trim() || !composeMessage.trim()) return;

    try {
      await sendMessage.mutateAsync({
        subject: composeSubject.trim(),
        message: composeMessage.trim(),
        priority: composePriority,
        // No receiverId = message goes to Super Admin
      });
      toast.success('Message sent successfully');
      setIsComposeOpen(false);
      setComposeSubject('');
      setComposeMessage('');
      setComposePriority('NORMAL');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Failed to send message:', error);
    }
  }, [composeSubject, composeMessage, composePriority, sendMessage]);

  const getRecipientName = (comm: (typeof communications)[0]) => {
    if (comm.member) {
      return `${comm.member.firstName} ${comm.member.lastName}`;
    }
    if (comm.lead) {
      return `${comm.lead.firstName} ${comm.lead.lastName} (Lead)`;
    }
    return comm.recipientEmail || comm.recipientPhone || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communications</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage messages and contact support
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('messages')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'messages'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors relative",
                activeTab === 'support'
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Headphones className="h-4 w-4" />
              Support
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          {activeTab === 'messages' && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          )}
          {activeTab === 'support' && (
            <Button onClick={() => setIsComposeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          )}
        </div>
      </div>

      {/* MEMBER COMMUNICATIONS TAB */}
      {activeTab === 'messages' && (
        <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SMS Sent</p>
                <p className="text-2xl font-bold">{communications.filter(c => c.type === 'SMS').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{communications.filter(c => c.type === 'EMAIL').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{communications.filter(c => c.status === 'DELIVERED').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{communications.filter(c => c.status === 'PENDING').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select 
              value={type} 
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select 
              value={status} 
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {meta ? `${meta.total} Messages` : 'Messages'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No communications found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Start by sending your first message
              </p>
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Send New Message
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Recipient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Message</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Sent</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {communications.map((comm) => {
                    const TypeIcon = typeIcons[comm.type];
                    const statusInfo = statusConfig[comm.status];
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={comm.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <Badge className={cn("gap-1", typeColors[comm.type])}>
                            <TypeIcon className="h-3 w-3" />
                            {comm.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {getRecipientName(comm)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {comm.recipientEmail || comm.recipientPhone}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div>
                            {comm.subject && (
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {comm.subject}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {comm.message}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={cn("gap-1", statusInfo.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {comm.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(comm.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this communication?')) {
                                      deleteCommunication.mutate(comm.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, meta.total)} of {meta.total} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* SUPPORT MESSAGING TAB */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
          {/* Message List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchMessages()}
                  className="h-8 w-8 p-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {isLoadingMessages ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading messages...
                </div>
              ) : supportMessages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start a conversation with support</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {supportMessages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSelectedMessageId(msg.id);
                        setReplyText('');
                      }}
                      className={cn(
                        "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                        selectedMessageId === msg.id && "bg-blue-50 dark:bg-blue-900/20",
                        msg.status === 'UNREAD' && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {msg.status === 'UNREAD' && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white truncate text-sm">
                              {getSenderName(msg)}
                            </span>
                            {msg.sender.role === 'SUPER_ADMIN' && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mt-0.5">
                            {msg.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {msg.message.substring(0, 50)}...
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatMessageDate(msg.createdAt)}
                          </span>
                          {msg.priority !== 'NORMAL' && (
                            <Badge className={cn("text-xs", priorityColors[msg.priority])}>
                              {msg.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Detail */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedMessageId && selectedMessage ? (
              <>
                <CardHeader className="pb-3 border-b dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedMessage.subject}
                        <Badge className={priorityColors[selectedMessage.priority]}>
                          {selectedMessage.priority}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {selectedMessage.sender.role === 'SUPER_ADMIN' ? 'From: Support Team' : `From: ${getSenderName(selectedMessage)}`}
                        {' • '}
                        {new Date(selectedMessage.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMessageId(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessage ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Loading conversation...
                    </div>
                  ) : (
                    <>
                      {/* Original Message */}
                      <div className={cn(
                        "p-4 rounded-lg",
                        selectedMessage.sender.role === 'SUPER_ADMIN'
                          ? "bg-blue-50 dark:bg-blue-900/20 ml-8"
                          : "bg-gray-50 dark:bg-gray-800"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {getSenderName(selectedMessage)}
                            {selectedMessage.sender.role === 'SUPER_ADMIN' && (
                              <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                            )}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(selectedMessage.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm">
                          {selectedMessage.message}
                        </p>
                      </div>

                      {/* Replies */}
                      {selectedMessage.replies?.map((reply) => (
                        <div
                          key={reply.id}
                          className={cn(
                            "p-4 rounded-lg",
                            reply.sender.role === 'SUPER_ADMIN'
                              ? "bg-blue-50 dark:bg-blue-900/20 ml-8"
                              : "bg-gray-50 dark:bg-gray-800"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {getSenderName(reply)}
                              {reply.sender.role === 'SUPER_ADMIN' && (
                                <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm">
                            {reply.message}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
                {/* Reply Input */}
                <div className="p-4 border-t dark:border-gray-800">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="self-end"
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a message from the list to view details</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Compose Dialog */}
      <AlertDialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Contact Support</AlertDialogTitle>
            <AlertDialogDescription>
              Send a message to the administrator. They will respond as soon as possible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject
              </label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="What do you need help with?"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select
                value={composePriority}
                onChange={(e) => setComposePriority(e.target.value as MessagePriority)}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Message
              </label>
              <Textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Describe your issue or question..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompose}
              disabled={!composeSubject.trim() || !composeMessage.trim() || sendMessage.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
