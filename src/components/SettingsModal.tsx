import React, { useState } from 'react';
import { X, Server, Key, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { kimaiApi } from '../services/api';
import { useAppStore } from '../store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsFormData {
  serverUrl: string;
  apiToken: string;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [isClearing, setIsClearing] = useState(false);
  const { setAuthenticated } = useAppStore();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<SettingsFormData>();

  // Load current credentials when modal opens
  const loadCurrentCredentials = async () => {
    if (typeof window !== 'undefined') {
      if ('__TAURI__' in window) {
        // Desktop - would need to implement get credentials command
        // For now, just show empty form
      } else {
        // Browser - load from localStorage
        const serverUrl = localStorage.getItem('kimai_server_url') || '';
        const apiToken = localStorage.getItem('kimai_api_token') || '';
        setValue('serverUrl', serverUrl);
        setValue('apiToken', apiToken ? '••••••••••••' : ''); // Mask the token
      }
    }
  };

  // Load credentials when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadCurrentCredentials();
    }
  }, [isOpen]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      // Only update if token is not masked
      if (data.apiToken && !data.apiToken.includes('•')) {
        await kimaiApi.saveCredentials(data.serverUrl.trim(), data.apiToken.trim());
      } else if (data.serverUrl) {
        // Update only server URL, keep existing token
        const existingToken = localStorage.getItem('kimai_api_token') || '';
        if (existingToken) {
          await kimaiApi.saveCredentials(data.serverUrl.trim(), existingToken);
        }
      }
      onClose();
      // Reload page to reinitialize with new credentials
      window.location.reload();
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleClearCredentials = async () => {
    if (!confirm('Are you sure you want to clear all credentials? You will need to log in again.')) {
      return;
    }

    setIsClearing(true);
    try {
      await kimaiApi.clearCredentials();
      setAuthenticated(false);
      onClose();
      // Reload to show login screen
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-surface rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-text">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Server URL */}
          <div>
            <label htmlFor="serverUrl" className="block text-sm font-medium text-dark-text mb-2">
              Server URL
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                {...register('serverUrl', { required: 'Server URL is required' })}
                type="url"
                id="serverUrl"
                placeholder="https://your-kimai.example.com"
                className="input-field pl-10 w-full"
              />
            </div>
            {errors.serverUrl && (
              <p className="mt-1 text-sm text-red-400">{errors.serverUrl.message}</p>
            )}
          </div>

          {/* API Token */}
          <div>
            <label htmlFor="apiToken" className="block text-sm font-medium text-dark-text mb-2">
              API Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                {...register('apiToken')}
                type="password"
                id="apiToken"
                placeholder="Leave empty to keep current token"
                className="input-field pl-10 w-full"
              />
            </div>
            <p className="mt-1 text-xs text-dark-text-secondary">
              Leave empty to keep your current API token
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClearCredentials}
              disabled={isClearing}
              className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isClearing ? 'Clearing...' : 'Clear & Logout'}</span>
            </button>

            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}