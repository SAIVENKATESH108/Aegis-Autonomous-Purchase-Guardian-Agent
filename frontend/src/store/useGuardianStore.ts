import { create } from 'zustand';
import type { Item, Escalation, ToastNotification } from '../types';

interface GuardianState {
  // Navigation & Modals
  activeTab: 'dashboard' | 'alerts' | 'all-items' | 'radar';
  setActiveTab: (tab: 'dashboard' | 'alerts' | 'all-items' | 'radar') => void;
  
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;

  isArchitectureModalOpen: boolean;
  setIsArchitectureModalOpen: (open: boolean) => void;

  isNotificationHubOpen: boolean;
  setIsNotificationHubOpen: (open: boolean) => void;

  isVideoGuideOpen: boolean;
  setIsVideoGuideOpen: (open: boolean) => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: 'all' | 'urgent' | 'routine' | 'resolved';
  setFilterStatus: (filter: 'all' | 'urgent' | 'routine' | 'resolved') => void;
  
  selectedItem: Item | null;
  setSelectedItem: (item: Item | null) => void;
  
  selectedEscalation: Escalation | null;
  setSelectedEscalation: (escalation: Escalation | null) => void;

  // In-app Notifications
  toasts: ToastNotification[];
  addToast: (toast: { title: string; message: string; type?: 'success' | 'urgent' | 'info' }) => void;
  removeToast: (id: string) => void;
}

export const useGuardianStore = create<GuardianState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  isAddModalOpen: false,
  setIsAddModalOpen: (open) => set({ isAddModalOpen: open }),

  isArchitectureModalOpen: false,
  setIsArchitectureModalOpen: (open) => set({ isArchitectureModalOpen: open }),

  isNotificationHubOpen: false,
  setIsNotificationHubOpen: (open) => set({ isNotificationHubOpen: open }),

  isVideoGuideOpen: false,
  setIsVideoGuideOpen: (open) => set({ isVideoGuideOpen: open }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  filterStatus: 'all',
  setFilterStatus: (filter) => set({ filterStatus: filter }),

  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),

  selectedEscalation: null,
  setSelectedEscalation: (escalation) => set({ selectedEscalation: escalation }),

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastNotification = {
      id,
      title: toast.title,
      message: toast.message,
      type: toast.type || 'info',
      timestamp: Date.now(),
    };
    set((state) => ({ toasts: [newToast, ...state.toasts.slice(0, 4)] }));
    
    // Auto-dismiss after 6s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 6000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
