import { Minimize2 } from 'lucide-react';
import { systemService } from '../services/system';

export function SystemTrayButton() {
  const handleMinimizeToTray = async () => {
    await systemService.hideMainWindow();
  };

  // Only show in Tauri environment
  const isTauri = '__TAURI__' in window;
  if (!isTauri) {
    return null;
  }

  return (
    <button
      onClick={handleMinimizeToTray}
      className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
      title="Minimize to system tray"
    >
      <Minimize2 className="w-4 h-4 text-gray-400" />
    </button>
  );
}