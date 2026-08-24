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
  useTenants,
  type InternalMessage,
  type MessageFilters,
  type MessagePriority,
  type MessageStatus,
} from '@/lib/client/hooks';

// UI Components
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Inbox,
  Send,
  Reply,
  Trash2,
  X,
  Plus,
  Search,
  Filter,
  CheckCheck,
  Archive,
  AlertCircle,
  MoreVertical,
  User,
  Building2,
  Clock,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

type TabType = 'inbox' | 'sent' | 'all';

const priorityColors: Record<MessagePriority, string> = {
  LOW: 'bg-muted text-muted-foreground border-border',
  NORMAL: 'bg-muted text-muted-foreground border-border',
  HIGH: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200',
  URGENT: 'bg-destructive/10 text-destructive border-destructive/30',
};

const statusColors: Record<MessageStatus, string> = {
  UNREAD: 'bg-muted-foreground text-white border-transparent',
  READ: 'bg-muted text-muted-foreground border-border',
  REPLIED: 'bg-success/10 text-success border-success/30',
  ARCHIVED: 'bg-primary/10 text-primary border-primary/30',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function getSenderName(message: InternalMessage) {
  if (!message.sender) return 'Unknown';
  return `${message.sender.firstName} ${message.sender.lastName}`;
}

export default function SuperAdminCommunicationsPage() {
  // ─── STATE ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTenantId, setComposeTenantId] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composePriority, setComposePriority] = useState<MessagePriority>('NORMAL');

  // Filters setup
  const [filters, setFilters] = useState<MessageFilters>({
    page: 1,
    pageSize: 50, // Increase page size for better list view
    type: activeTab // Pass activeTab as type to filter
  });

  const { data: messagesData, isLoading, refetch } = useMessages(
    { ...filters, type: activeTab },
    { refetchInterval: 15000 }
  );

  const { data: selectedMessage, isLoading: isLoadingMessage } = useMessage(selectedMessageId || '');
  const { data: unreadCount } = useUnreadMessageCount();
  const { data: tenantsData } = useTenants({ pageSize: 100, isActive: true });

  const messages = messagesData?.data ?? [];
  const tenants = tenantsData?.data ?? [];

  const sendMessage = useSendMessage();
  const replyMutation = useReplyToMessage(selectedMessageId || '');
  const deleteMutation = useDeleteMessage();

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSelectedMessageId(null);
    setFilters(prev => ({ ...prev, type: tab, page: 1 }));
  }, []);

  const handleSelectMessage = (id: string) => {
    setSelectedMessageId(id);
    setReplyText('');
  };

  const handleSendReply = async () => {
    if (!selectedMessageId || !replyText.trim() || !selectedMessage) return;

    try {
      await replyMutation.mutateAsync({
        message: replyText,
        subject: `Re: ${selectedMessage.subject}`,
        priority: selectedMessage.priority,
        receiverId: selectedMessage.senderId, // Important for reply
      });
      setReplyText('');
      toast.success("Reply sent successfully");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      if (selectedMessageId === deleteConfirmId) {
        setSelectedMessageId(null);
      }
      setDeleteConfirmId(null);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleCompose = async () => {
    if (!composeTenantId || !composeSubject.trim() || !composeMessage.trim()) return;

    try {
      await sendMessage.mutateAsync({
        tenantId: composeTenantId,
        subject: composeSubject,
        message: composeMessage,
        priority: composePriority,
      });
      setIsComposeOpen(false);

      // Reset form
      setComposeTenantId('');
      setComposeSubject('');
      setComposeMessage('');
      setComposePriority('NORMAL');

      toast.success("Message sent successfully");
      refetch(); // Refresh list
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  // Client-side filtering if needed (though API 'type' filter should handle it)
  const filteredMessages = messages.filter(msg => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSubject = msg.subject.toLowerCase().includes(searchLower);
      const matchesBody = msg.message.toLowerCase().includes(searchLower);
      const matchesSender = getSenderName(msg).toLowerCase().includes(searchLower);
      return matchesSubject || matchesBody || matchesSender;
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-0 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/20 shadow-sm">
      {/* ─── SIDEBAR: MESSAGE LIST ────────────────────────────────────────── */}
      <div className={cn(
        "w-full md:w-[22rem] lg:w-[24rem] xl:w-[26rem] border-r border-border/60 flex flex-col bg-muted/20",
        selectedMessageId ? "hidden md:flex" : "flex"
      )}>
        {/* Header & Controls */}
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
              <p className="text-sm text-muted-foreground">
                Inbox, sent, and all conversations in one place.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh" aria-label="Refresh">
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Sheet open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                <SheetTrigger className={buttonVariants({ size: "sm", className: "gap-2 rounded-xl px-4 shadow-sm" })}>
                  <Plus className="h-4 w-4" />
                  Compose
                </SheetTrigger>
                <SheetContent className="overflow-y-auto sm:max-w-md md:max-w-lg w-full">
                  <SheetHeader>
                    <SheetTitle>New Message</SheetTitle>
                    <SheetDescription>
                      Send a new message to a specific tenant.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tenant</label>
                      <Select value={composeTenantId} onValueChange={(value) => setComposeTenantId(value ?? '')}>
                        <SelectTrigger>
                          {composeTenantId ? tenants.find(t => t.id === composeTenantId)?.name : "Select a tenant"}
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        placeholder="Enter subject..."
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={composePriority} onValueChange={(val) => setComposePriority(val as MessagePriority)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low - Routine</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="HIGH">High - Important</SelectItem>
                          <SelectItem value="URGENT">Urgent - Immediate Action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Message</label>
                      <Textarea
                        placeholder="Type your message here..."
                        className="min-h-50"
                        value={composeMessage}
                        onChange={(e) => setComposeMessage(e.target.value)}
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
                      <Button onClick={handleCompose} disabled={sendMessage.isPending}>
                        {sendMessage.isPending ? 'Sending...' : 'Send Message'}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/60 bg-background/80 p-1.5 shadow-sm backdrop-blur-sm">
            {(['inbox', 'sent', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold capitalize transition-all",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab === 'inbox' && <Inbox className="w-4 h-4" />}
                {tab === 'sent' && <Send className="w-4 h-4" />}
                {tab === 'all' && <Archive className="w-4 h-4" />}
                <span>{tab}</span>
                {tab === 'inbox' && typeof unreadCount === 'number' && unreadCount > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 h-4 flex items-center rounded-full ml-0.5",
                    activeTab === tab ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary text-primary-foreground"
                  )}>
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-background border-border/70 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 rounded-2xl border border-dashed border-border/70 bg-background/60 m-2">
              <Inbox className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg.id)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-border hover:bg-background hover:shadow-sm flex flex-col gap-1.5 items-start",
                    selectedMessageId === msg.id
                      ? "border-primary/25 bg-primary/5 shadow-sm ring-1 ring-primary/15"
                      : "border-transparent bg-background/60",
                    msg.status === 'UNREAD' ? "font-medium" : ""
                  )}
                >
                  <div className="w-full flex items-start justify-between gap-2 mb-0.5">
                    <span className={cn(
                      "text-sm truncate max-w-[70%]",
                      msg.status === 'UNREAD' ? "font-bold text-foreground" : "font-semibold text-muted-foreground"
                    )}>
                      {getSenderName(msg)}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>

                  <div className="w-full flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-sm truncate flex-1",
                      msg.status === 'UNREAD' ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
                      {msg.subject}
                    </span>
                    {msg.priority !== 'NORMAL' && (
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1 gap-0.5 rounded-sm border-0", priorityColors[msg.priority])}>
                        {msg.priority === 'URGENT' && <AlertCircle className="w-2 h-2" />}
                        {msg.priority}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 w-full wrap-break-word">
                    {msg.message}
                  </p>

                  {msg.tenant && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full self-start border border-border/50">
                      <Building2 className="w-3 h-3 opacity-70" />
                      {msg.tenant.name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN CONTENT: MESSAGE DETAIL ────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden bg-background",
        !selectedMessageId ? "hidden md:flex" : "flex fixed inset-0 z-20 md:static bg-background overflow-hidden"
      )}>
        {selectedMessageId && selectedMessage ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-border/60 px-5 py-4 flex items-start justify-between bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
              <div className="flex items-start gap-4 flex-1 overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2 shrink-0"
                  onClick={() => setSelectedMessageId(null)} aria-label="Close">
                  <X className="h-5 w-5" />
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold truncate tracking-tight">{selectedMessage.subject}</h2>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className={cn("rounded-sm font-medium border", priorityColors[selectedMessage.priority])}>
                        {selectedMessage.priority}
                      </Badge>
                      <Badge variant="outline" className={cn("rounded-sm font-medium border", statusColors[selectedMessage.status])}>
                        {selectedMessage.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-muted-foreground/70" />
                      <span className="font-medium text-foreground">{getSenderName(selectedMessage)}</span>
                    </div>
                    {selectedMessage.tenant && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground/50 mx-1">•</span>
                        <Building2 className="w-4 h-4 text-muted-foreground/70" />
                        <span>{selectedMessage.tenant.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                      <span className="hidden md:inline text-muted-foreground/50 mx-1">•</span>
                      <Clock className="w-4 h-4 text-muted-foreground/70" />
                      <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 pl-4">
                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(selectedMessage.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Thread Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-6 bg-gradient-to-b from-muted/10 via-background to-muted/20 md:px-6">
              {isLoadingMessage ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : (
                <>
                  {/* Original Message */}
                  <div className="flex gap-4 max-w-4xl mx-auto w-full">
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-bold text-sm shrink-0">
                      {getSenderName(selectedMessage).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold text-sm text-foreground">{getSenderName(selectedMessage)}</span>
                      </div>
                      <Card className="border shadow-sm bg-background">
                        <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedMessage.message}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Divider if replies exist */}
                  {(selectedMessage.replies?.length ?? 0) > 0 && (
                    <div className="relative flex items-center py-4 max-w-4xl mx-auto">
                      <div className="grow border-t border-border"></div>
                      <span className="shrink-0 mx-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Replies</span>
                      <div className="grow border-t border-border"></div>
                    </div>
                  )}

                  {/* Replies */}
                  {selectedMessage.replies?.map((reply) => {
                    const isAdmin = reply.sender.role === 'SUPER_ADMIN';
                    return (
                      <div key={reply.id} className={cn("flex gap-4 max-w-4xl mx-auto w-full", isAdmin ? "justify-end" : "") }>
                        {!isAdmin && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 border bg-muted text-muted-foreground border-border">
                            {getSenderName(reply).charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className={cn("flex-1 max-w-[85%] space-y-1", isAdmin ? "text-right" : "")}>
                          <div className={cn("flex items-baseline gap-2", isAdmin ? "flex-row-reverse" : "")}>
                            <span className="font-semibold text-sm text-foreground">
                              {isAdmin ? 'Support Team' : getSenderName(reply)}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                          </div>
                          <Card className={cn(
                            "border-none shadow-sm text-sm p-4 inline-block text-left",
                            isAdmin
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-background rounded-tl-sm border"
                          )}>
                            <p className="whitespace-pre-wrap">{reply.message}</p>
                          </Card>
                        </div>

                        {isAdmin && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 border bg-primary/10 text-primary border-primary/20">
                            S
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Reply Input Area */}
            <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-4 md:px-6">
              <div className="max-w-4xl mx-auto flex gap-4 items-end">
                <Textarea
                  className="min-h-10 w-full resize-none rounded-2xl border-border/70 bg-background shadow-sm focus-visible:ring-1"
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  size="icon"
                  className="h-10 w-10" aria-label="Send">
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Pressing send will notify the tenant immediately via email.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-muted/10 via-background to-muted/20 text-muted-foreground">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6 border border-border/60 shadow-sm">
              <Inbox className="w-10 h-10 opacity-40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Select a conversation</h3>
            <p className="max-w-xs text-center mt-2 mb-8 text-muted-foreground">
              Choose a message from the list to view details and reply to tenants.
            </p>
            <Button onClick={() => setIsComposeOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              New Message
            </Button>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message thread? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
