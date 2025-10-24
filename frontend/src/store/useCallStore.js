import { create } from 'zustand'

export const useCallStore = create((set) => ({
  activeCall: null,
  
  openCall: (callData) => set({ activeCall: callData }),
  closeCall: () => set({ activeCall: null })
}))