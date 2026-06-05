/**
 * Global type declarations for ScholarFlow
 */

// Electron preload API
interface ElectronAPI {
  isElectron: boolean;
  encryptAndStoreToken: (token: string) => Promise<boolean>;
  retrieveToken: () => Promise<string | null>;
  clearToken: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
