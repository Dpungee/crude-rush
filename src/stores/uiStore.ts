import { create } from 'zustand'
import type { PanelTab, Toast } from '@/types'

interface UiState {
  // Panel
  activeTab: PanelTab
  setActiveTab: (tab: PanelTab) => void

  // Selected cell for build/upgrade menu
  selectedCell: { x: number; y: number } | null
  selectCell: (x: number, y: number) => void
  clearSelection: () => void

  // Modals
  showDailyReward: boolean
  setShowDailyReward: (show: boolean) => void
  showOfflineIncome: boolean
  offlineIncomeData: { crude: number; refined: number; seconds: number } | null
  setOfflineIncome: (data: { crude: number; refined: number; seconds: number } | null) => void
  showPrestigeConfirm: boolean
  setShowPrestigeConfirm: (show: boolean) => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Build menu
  showBuildMenu: boolean
  setShowBuildMenu: (show: boolean) => void

  // Sell flash — timestamp of last sell action for visual feedback
  sellFlashAt: number
  triggerSellFlash: () => void
}

let toastId = 0

export const useUiStore = create<UiState>((set, get) => ({
  activeTab: 'upgrades',  // Start on upgrades — new players have nothing to sell
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedCell: null,
  selectCell: (x, y) => set({ selectedCell: { x, y }, showBuildMenu: true }),
  clearSelection: () => set({ selectedCell: null, showBuildMenu: false }),

  showDailyReward: false,
  setShowDailyReward: (show) => set({ showDailyReward: show }),

  showOfflineIncome: false,
  offlineIncomeData: null,
  setOfflineIncome: (data) =>
    set({ offlineIncomeData: data, showOfflineIncome: data !== null }),

  showPrestigeConfirm: false,
  setShowPrestigeConfirm: (show) => set({ showPrestigeConfirm: show }),

  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    // Auto-remove after duration
    setTimeout(() => {
      get().removeToast(id)
    }, toast.duration ?? 3000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  showBuildMenu: false,
  setShowBuildMenu: (show) => set({ showBuildMenu: show }),

  sellFlashAt: 0,
  triggerSellFlash: () => set({ sellFlashAt: Date.now() }),
}))
