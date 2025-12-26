'use client';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN - COMMUNICATIONS PAGE
 * Internal messaging center for Super Admin to communicate with Tenants
 * ════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { 
  useMessages, 
  useMessage,
  useSendMessage, 
  useReplyToMessage,
  useDeleteMessage,
  useUnreadMessageCount,
  type InternalMessage,
  type MessageFilters,
  type MessagePriority,
  type MessageStatus,
} from '@/lib/client/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

type TabType = 'inbox' | 'sent' | 'all';

const priorityColors: Record<MessagePriority, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusColors: Record<MessageStatus, string> = {
  UNREAD: 'bg-blue-500 text-white',
  READ: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  REPLIED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  ARCHIVED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

// ═══════════════════════════════════════════════════════════════════════════
// ICONS (inline SVG)
// ═══════════════════════════════════════════════════════════════════════════

const InboxIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ReplyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(dateString: string) {
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function SuperAdminCommunicationsPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Compose form state
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composePriority, setComposePriority] = useState<MessagePriority>('NORMAL');

  // Filters
  const [filters, setFilters] = useState<MessageFilters>({
    type: 'inbox',
    page: 1,
    pageSize: 20,
  });

  // Queries
  const { data: messagesData, isLoading, refetch } = useMessages(
    { ...filters, type: activeTab },
    { refetchInterval: 10000 } // Poll every 10 seconds
  );
  const { data: unreadCount } = useUnreadMessageCount();
  const { data: selectedMessage, isLoading: isLoadingMessage } = useMessage(
    selectedMessageId || undefined
  );

  // Mutations
  const sendMessage = useSendMessage();
  const replyMutation = useReplyToMessage(selectedMessageId || '');
  const deleteMessage = useDeleteMessage();

  // Handlers
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSelectedMessageId(null);
  }, []);

  const handleSelectMessage = useCallback((id: string) => {
    setSelectedMessageId(id);
    setReplyText('');
  }, []);

  const handleSendReply = useCallback(async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        subject: `Re: ${selectedMessage.subject}`,
        message: replyText.trim(),
        priority: selectedMessage.priority,
        receiverId: selectedMessage.senderId,
      });
      setReplyText('');
    } catch (error) {
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
      });
      setIsComposeOpen(false);
      setComposeSubject('');
      setComposeMessage('');
      setComposePriority('NORMAL');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [composeSubject, composeMessage, composePriority, sendMessage]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteMessage.mutateAsync(deleteConfirmId);
      if (selectedMessageId === deleteConfirmId) {
        setSelectedMessageId(null);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [deleteConfirmId, deleteMessage, selectedMessageId]);

  const messages = messagesData?.data ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
      {/* Sidebar - Message List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Messages
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="p-2"
              >
                <RefreshIcon />
              </Button>
              <Button
                size="sm"
                onClick={() => setIsComposeOpen(true)}
                className="gap-1"
              >
                <PlusIcon />
                New
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => handleTabChange('inbox')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <InboxIcon />
              Inbox
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('sent')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'sent'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <SendIcon />
              Sent
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <InboxIcon />
              <p className="mt-2">No messages</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedMessageId === msg.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  } ${msg.status === 'UNREAD' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {msg.status === 'UNREAD' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {getSenderName(msg)}
                        </span>
                      </div>
                      {msg.tenant && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {msg.tenant.name}
                        </p>
                      )}
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mt-1">
                        {msg.subject}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {msg.message.substring(0, 50)}...
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(msg.createdAt)}
                      </span>
                      {msg.priority !== 'NORMAL' && (
                        <Badge className={priorityColors[msg.priority]}>
                          {msg.priority}
                        </Badge>
                      )}
                      {msg._count && msg._count.replies > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {msg._count.replies} replies
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Message Detail */}
      <div className="flex-1 flex flex-col">
        {selectedMessageId && selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedMessage.subject}
                    </h2>
                    <Badge className={priorityColors[selectedMessage.priority]}>
                      {selectedMessage.priority}
                    </Badge>
                    <Badge className={statusColors[selectedMessage.status]}>
                      {selectedMessage.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    From: {getSenderName(selectedMessage)}
                    {selectedMessage.tenant && ` • ${selectedMessage.tenant.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(selectedMessage.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <TrashIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessageId(null)}
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessage ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Loading message...
                </div>
              ) : (
                <>
                  {/* Original message */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {getSenderName(selectedMessage)}
                        </CardTitle>
                        <CardDescription>
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {selectedMessage.message}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Replies */}
                  {selectedMessage.replies?.map((reply) => (
                    <Card 
                      key={reply.id}
                      className={reply.sender.role === 'SUPER_ADMIN' ? 'ml-8 border-blue-200 dark:border-blue-800' : ''}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            {getSenderName(reply)}
                            {reply.sender.role === 'SUPER_ADMIN' && (
                              <Badge variant="outline" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {new Date(reply.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {reply.message}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="self-end"
                >
                  <ReplyIcon />
                  Reply
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <InboxIcon />
              <p className="mt-2">Select a message to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Dialog */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Message</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsComposeOpen(false)}
                >
                  <XIcon />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subject
                </label>
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Message subject"
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
                  placeholder="Write your message..."
                  className="mt-1"
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompose}
                  disabled={!composeSubject.trim() || !composeMessage.trim() || sendMessage.isPending}
                >
                  <SendIcon />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
