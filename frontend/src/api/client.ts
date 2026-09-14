import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Item, Escalation, SystemStats } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// API Fetch Helpers
async function fetchItems(status?: string): Promise<Item[]> {
  const url = status ? `${API_BASE}/items?status=${status}` : `${API_BASE}/items`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tracked purchases');
  return res.json();
}

async function fetchAlerts(status: string = 'pending'): Promise<Escalation[]> {
  const res = await fetch(`${API_BASE}/alerts?status=${status}`);
  if (!res.ok) throw new Error('Failed to fetch escalations');
  return res.json();
}

async function fetchStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch guardian statistics');
  return res.json();
}

async function fetchEvents() {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error('Failed to fetch observer events');
  return res.json() as Promise<{
    in_app_events: any[];
    telegram_dispatches: string[];
    active_observers_count: number;
  }>;
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    refetchInterval: 5000,
  });
}

// React Query Hooks
export function useItems(status?: string) {
  return useQuery({
    queryKey: ['items', status],
    queryFn: () => fetchItems(status),
  });
}

export function useAlerts(status: string = 'pending') {
  return useQuery({
    queryKey: ['alerts', status],
    queryFn: () => fetchAlerts(status),
    // Requirement: Poll GET /alerts every 30 seconds
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 15000,
  });
}

// Mutations
export function useAddItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { raw_text?: string; json_data?: any; format: string }) => {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to ingest purchase receipt');
      return res.json() as Promise<Item>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useApproveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await fetch(`${API_BASE}/alerts/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to approve action draft');
      return res.json() as Promise<Escalation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/alerts/${id}/dismiss`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to dismiss alert');
      return res.json() as Promise<Escalation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useSeedDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to load sample demonstration receipts');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset demo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Live CPSC Search & Protection
export function useLiveRecallSearch(query: string) {
  return useQuery({
    queryKey: ['live-recalls', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await fetch(`${API_BASE}/recalls/live-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to query CPSC database');
      const data = await res.json();
      return (data.results || []) as import('../types').LiveRecallResult[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProtectRecall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<import('../types').LiveRecallResult> & { merchant?: string; price?: number; model_number?: string }) => {

      const res = await fetch(`${API_BASE}/recalls/protect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to shield recalled product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useSimulateExpiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { item_id?: string }) => {
      const res = await fetch(`${API_BASE}/demo/simulate-expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      if (!res.ok) throw new Error('Failed to simulate expiry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}


