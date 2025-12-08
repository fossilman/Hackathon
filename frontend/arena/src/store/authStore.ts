import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  walletAddress: string | null
  token: string | null
  participantId: number | null
  connectWallet: (address: string, token: string, participantId: number) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      walletAddress: null,
      token: null,
      participantId: null,
      connectWallet: (address, token, participantId) =>
        set({ walletAddress: address, token, participantId }),
      clearAuth: () => set({ walletAddress: null, token: null, participantId: null }),
    }),
    {
      name: 'arena-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

