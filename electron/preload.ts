import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
  getAppVersion: () => Promise<string>;
}

const api: ElectronAPI = {
  invoke: (channel: string, ...args: any[]) => {
    // Güvenlik: İzin verilen IPC kanalları
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => listener(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getAppVersion: () => ipcRenderer.invoke('app:version'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
