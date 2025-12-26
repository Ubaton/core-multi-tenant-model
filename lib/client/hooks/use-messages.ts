/**
 * ════════════════════════════════════════════════════════════════════════════
 * INTERNAL MESSAGES HOOKS - TanStack Query
 * Real-time messaging between Tenants and Super Admin
 * ════════════════════════════════════════════════════════════════════════════
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type MessageStatus = 'UNREAD' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface MessageUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface MessageTenant {
  id: string;
  name: string;
  slug: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  sender: MessageUser;
  receiverId: string | null;
  receiver: MessageUser | null;
  tenantId: string | null;
  tenant: MessageTenant | null;
  subject: string;
  message: string;
  priority: MessagePriority;
  status: MessageStatus;
  parentId: string | null;
  parent?: InternalMessage | null;
  replies?: InternalMessage[];
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    replies: number;
  };
}

export interface MessageFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: MessageStatus;
  priority?: MessagePriority;
  tenantId?: string;
  type?: 'inbox' | 'sent' | 'all';
}

export interface CreateMessageInput {
  subject: string;
  message: string;
  priority?: MessagePriority;
  receiverId?: string;
  parentId?: string;
  tenantId?: string; // For Super Admin to send to specific tenant
}

export interface UpdateMessageInput {
  status?: MessageStatus;
  readAt?: true;
  archivedAt?: true;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (filters: MessageFilters) => [...messageKeys.lists(), filters] as const,
  details: () => [...messageKeys.all, 'detail'] as const,
  detail: (id: string) => [...messageKeys.details(), id] as const,
  unreadCount: () => [...messageKeys.all, 'unread-count'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get list of messages with real-time polling
 */
export function useMessages(filters: MessageFilters = {}, options: { refetchInterval?: number } = {}) {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.tenantId) params.append('tenantId', filters.tenantId);
  if (filters.type) params.append('type', filters.type);

  const queryString = params.toString();
  const url = `/api/messages${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: messageKeys.list(filters),
    queryFn: async () => {
      const response = await get<InternalMessage[]>(url);
      return {
        data: response.data ?? [],
        meta: response.meta,
      };
    },
    // Enable real-time updates via polling (default: 10 seconds)
    refetchInterval: options.refetchInterval ?? 10000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Get single message with full thread
 */
export function useMessage(id: string | undefined) {
  return useQuery({
    queryKey: messageKeys.detail(id!),
    queryFn: async () => {
      const response = await get<InternalMessage>(`/api/messages/${id}`);
      return response.data ?? null;
    },
    enabled: !!id,
    // Poll for new replies
    refetchInterval: 5000,
  });
}

/**
 * Get unread message count
 */
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: async () => {
      const response = await get<InternalMessage[]>('/api/messages?type=inbox&status=UNREAD&pageSize=1');
      // The API returns paginated response with meta
      return (response as { meta?: { totalCount?: number } })?.meta?.totalCount ?? 0;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
}

/**
 * Send a new message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageInput) => post<InternalMessage>('/api/messages', data),
    onSuccess: () => {
      // Invalidate all message queries to refresh lists
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

/**
 * Reply to a message
 */
export function useReplyToMessage(parentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateMessageInput, 'parentId'>) =>
      post<InternalMessage>('/api/messages', { ...data, parentId }),
    onSuccess: () => {
      // Invalidate the parent message to show new reply
      queryClient.invalidateQueries({ queryKey: messageKeys.detail(parentId) });
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
    },
  });
}

/**
 * Update message (mark read, archive, etc.)
 */
export function useUpdateMessage(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMessageInput) => patch<InternalMessage>(`/api/messages/${id}`, data),
    onSuccess: (updatedMessage) => {
      // Update cache
      queryClient.setQueryData(messageKeys.detail(id), updatedMessage);
      queryClient.invalidateQueries({ queryKey: messageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() });
    },
  });
}

/**
 * Mark message as read
 */
export function useMarkAsRead(id: string) {
  return useUpdateMessage(id);
}

/**
 * Archive message
 */
export function useArchiveMessage(id: string) {
  return useUpdateMessage(id);
}

/**
 * Delete message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del<{ deleted: boolean }>(`/api/messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}
