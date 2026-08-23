/**
 * ════════════════════════════════════════════════════════════════════════════
 * useAppMutation — Reusable mutation wrapper with auto-invalidation
 * (lib/client/hooks/use-app-mutation.ts)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * WHY:
 *  Every mutating operation (create / update / delete) follows the same
 *  lifecycle:
 *    1. Optimistically update the cache so the UI reacts instantly.
 *    2. Fire the network request.
 *    3a. On success → invalidate the related query keys so fresh data is
 *        fetched (or let the SSE channel handle it for cross-user changes).
 *    3b. On error  → roll back the optimistic update from the snapshot taken
 *        in step 1.
 *
 *  Encoding this once here prevents copy-paste errors across every hook file.
 *
 * USAGE:
 *
 *   // Create — invalidate the list after success
 *   const createMember = useAppMutation({
 *     mutationFn: (data: CreateMemberInput) =>
 *       post<Member>('/api/members', data).then(r => r.data!),
 *     invalidateKeys: [queryKeys.members.lists()],
 *   });
 *
 *   // Update — optimistic update on the detail + invalidate the list
 *   const updateMember = useAppMutation({
 *     mutationFn: ({ id, ...data }: { id: string } & UpdateMemberInput) =>
 *       patch<Member>(`/api/members/${id}`, data).then(r => r.data!),
 *     optimisticUpdate: {
 *       queryKey: queryKeys.members.detail(id),
 *       updater: (old: Member, vars) => ({ ...old, ...vars }),
 *     },
 *     invalidateKeys: [queryKeys.members.lists()],
 *   });
 *
 *   // Delete — optimistic removal from list cache
 *   const deleteMember = useAppMutation({
 *     mutationFn: (id: string) =>
 *       del(`/api/members/${id}`).then(() => id),
 *     optimisticUpdate: {
 *       queryKey: queryKeys.members.lists(),
 *       updater: (old: MembersResponse, id) => ({
 *         ...old,
 *         data: old.data.filter(m => m.id !== id),
 *       }),
 *     },
 *     invalidateKeys: [queryKeys.members.lists()],
 *   });
 *
 * GOTCHA (Cloud Run / Vercel):
 *  Cloud Run scales to zero between requests.  The first mutation after an
 *  idle period may take 2-3 s.  The retry: 1 default in makeQueryClient()
 *  handles a single transient failure.  Do NOT set retry > 1 for mutations
 *  that write data — you risk double-writes if the response times out but
 *  the server actually committed.
 */

'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptimisticUpdate<TCache, TVariables> {
  /** The exact query key whose cached data to update optimistically. */
  queryKey: QueryKey;
  /**
   * Pure function that merges the current cache value with the incoming
   * mutation variables.  Return `undefined` to remove the entry.
   *
   * `TCache` is the type of the cache being patched, which need not match the
   * mutation result `TData` — e.g. a delete returns an id but patches a list.
   */
  updater: (current: TCache, variables: TVariables) => TCache | undefined;
}

interface UseAppMutationOptions<TData, TError, TVariables, TCache = TData>
  extends Omit<
    UseMutationOptions<TData, TError, TVariables, { snapshot: TCache | undefined }>,
    'onMutate' | 'onError' | 'onSuccess'
  > {
  /** Query keys to invalidate after a successful mutation. */
  invalidateKeys?: QueryKey[];
  /**
   * Optional optimistic update.  The previous value is snapshotted
   * automatically for rollback on error.
   */
  optimisticUpdate?: OptimisticUpdate<TCache, TVariables>;
  /** Called after the cache has been invalidated. */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  /** Called after the rollback has been applied. */
  onError?: (error: TError, variables: TVariables) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppMutation<TData = unknown, TError = Error, TVariables = void, TCache = TData>({
  invalidateKeys = [],
  optimisticUpdate,
  onSuccess,
  onError,
  ...mutationOptions
}: UseAppMutationOptions<TData, TError, TVariables, TCache>) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, { snapshot: TCache | undefined }>({
    ...mutationOptions,

    // ── Step 1: optimistic update + snapshot ──────────────────────────────
    onMutate: async (variables) => {
      if (!optimisticUpdate) return { snapshot: undefined };

      const { queryKey, updater } = optimisticUpdate;

      // Cancel any in-flight fetches for this key so they don't overwrite
      // the optimistic value when they resolve.
      await queryClient.cancelQueries({ queryKey });

      // Take a snapshot of the current cache value for rollback.
      const snapshot = queryClient.getQueryData<TCache>(queryKey);

      // Apply the optimistic update.
      if (snapshot !== undefined) {
        const next = updater(snapshot, variables);
        queryClient.setQueryData(queryKey, next);
      }

      return { snapshot };
    },

    // ── Step 2a: error — roll back optimistic update ──────────────────────
    onError: (error, variables, context) => {
      if (optimisticUpdate && context?.snapshot !== undefined) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.snapshot);
      }
      onError?.(error, variables);
    },

    // ── Step 2b: success — invalidate related keys ────────────────────────
    onSuccess: async (data, variables) => {
      await Promise.all(
        invalidateKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        )
      );
      await onSuccess?.(data, variables);
    },
  });
}
