import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Server, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTestConnection, useSaveCredentials } from '../hooks/useKimaiApi';
import { kimaiApi } from '../services/api';

interface SetupFormData {
  serverUrl: string;
  apiToken: string;
}

interface SetupFormProps {
  onComplete: () => void;
}

export function SetupForm({ onComplete }: SetupFormProps) {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SetupFormData>({
    defaultValues: {
      serverUrl: '',
      apiToken: '',
    },
  });

  const testConnection = useTestConnection();
  const saveCredentials = useSaveCredentials();

  // Load existing credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const client = await (kimaiApi.constructor as any).fromStorage();
        if (client.isConfigured()) {
          // We can't get the actual values from the client for security,
          // but we can indicate they exist
          setConnectionStatus('success');
        }
      } catch (error) {
        console.error('Failed to load credentials:', error);
      }
    };

    loadCredentials();
  }, []);

  const validateUrl = (url: string) => {
    if (!url) return 'Server URL is required';
    
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return 'URL must use HTTP or HTTPS protocol';
      }
      return true;
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const onTestConnection = async (data: SetupFormData) => {
    setConnectionStatus('testing');
    setErrorMessage('');

    try {
      await testConnection.mutateAsync({
        serverUrl: data.serverUrl.trim(),
        apiToken: data.apiToken.trim(),
      });
      setConnectionStatus('success');
    } catch (error: any) {
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Failed to connect to Kimai server');
    }
  };

  const onSubmit = async (data: SetupFormData) => {
    // Test connection first if not already successful
    if (connectionStatus !== 'success') {
      try {
        await testConnection.mutateAsync({
          serverUrl: data.serverUrl.trim(),
          apiToken: data.apiToken.trim(),
        });
        setConnectionStatus('success');
      } catch (error: any) {
        setConnectionStatus('error');
        setErrorMessage(error.message || 'Failed to connect to Kimai server');
        return;
      }
    }

    try {
      await saveCredentials.mutateAsync({
        serverUrl: data.serverUrl.trim(),
        apiToken: data.apiToken.trim(),
      });
      onComplete();
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save credentials');
    }
  };

  const watchedValues = watch();

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark-text mb-2">Welcome to Kimai Desktop</h1>
          <p className="text-dark-text-secondary">
            Connect to your Kimai server to start tracking time
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Server URL Field */}
          <div>
            <label htmlFor="serverUrl" className="block text-sm font-medium text-dark-text mb-2">
              Server URL
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                {...register('serverUrl', { validate: validateUrl })}
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

          {/* API Token Field */}
          <div>
            <label htmlFor="apiToken" className="block text-sm font-medium text-dark-text mb-2">
              API Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                {...register('apiToken', { required: 'API token is required' })}
                type="password"
                id="apiToken"
                placeholder="Your API token"
                className="input-field pl-10 w-full"
              />
            </div>
            {errors.apiToken && (
              <p className="mt-1 text-sm text-red-400">{errors.apiToken.message}</p>
            )}
            <p className="mt-1 text-xs text-dark-text-secondary">
              You can find your API token in your Kimai profile settings
            </p>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 ${
              connectionStatus === 'success' ? 'bg-green-900/20 border border-green-500/20' :
              connectionStatus === 'error' ? 'bg-red-900/20 border border-red-500/20' :
              'bg-blue-900/20 border border-blue-500/20'
            }`}>
              {connectionStatus === 'testing' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
              {connectionStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
              {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              
              <span className={`text-sm ${
                connectionStatus === 'success' ? 'text-green-400' :
                connectionStatus === 'error' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {connectionStatus === 'testing' && 'Testing connection...'}
                {connectionStatus === 'success' && 'Connection successful!'}
                {connectionStatus === 'error' && (errorMessage || 'Connection failed')}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSubmit(onTestConnection)}
              disabled={testConnection.isPending || !watchedValues.serverUrl || !watchedValues.apiToken}
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
            >
              {testConnection.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Server className="w-4 h-4" />
              )}
              <span>Test Connection</span>
            </button>

            <button
              type="submit"
              disabled={saveCredentials.isPending || connectionStatus !== 'success'}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {saveCredentials.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Save & Continue</span>
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-dark-text-secondary">
            Your credentials are stored securely using system keychain
          </p>
        </div>
      </div>
    </div>
  );
}