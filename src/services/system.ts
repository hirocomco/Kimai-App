import { invoke } from '@tauri-apps/api/core';

export interface SystemService {
  showNotification: (title: string, body: string) => Promise<void>;
  updateTrayTooltip: (tooltip: string) => Promise<void>;
  showMainWindow: () => Promise<void>;
  hideMainWindow: () => Promise<void>;
}

class TauriSystemService implements SystemService {
  async showNotification(title: string, body: string): Promise<void> {
    try {
      await invoke('show_notification', { title, body });
    } catch (error) {
      console.error('Failed to show notification:', error);
      // Fallback to browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }

  async updateTrayTooltip(tooltip: string): Promise<void> {
    try {
      await invoke('update_tray_tooltip', { tooltip });
    } catch (error) {
      console.error('Failed to update tray tooltip:', error);
    }
  }

  async showMainWindow(): Promise<void> {
    try {
      await invoke('show_main_window');
    } catch (error) {
      console.error('Failed to show main window:', error);
    }
  }

  async hideMainWindow(): Promise<void> {
    try {
      await invoke('hide_main_window');
    } catch (error) {
      console.error('Failed to hide main window:', error);
    }
  }
}

// Fallback implementation for web/browser environment
class WebSystemService implements SystemService {
  async showNotification(title: string, body: string): Promise<void> {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  }

  async updateTrayTooltip(tooltip: string): Promise<void> {
    // No-op in web environment
    console.log('Tray tooltip would be:', tooltip);
  }

  async showMainWindow(): Promise<void> {
    // Focus the current window
    window.focus();
  }

  async hideMainWindow(): Promise<void> {
    // No-op in web environment (can't hide browser window)
    console.log('Hide window requested (not available in web)');
  }
}

// Detect if we're running in Tauri or web environment
const isTauri = '__TAURI__' in window;

export const systemService: SystemService = isTauri 
  ? new TauriSystemService() 
  : new WebSystemService();