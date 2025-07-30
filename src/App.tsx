import { useEffect, useState } from 'react';
import { SetupForm } from './components/SetupForm';
import { TimerView } from './components/TimerView';
import { useAppStore } from './store';
import { kimaiApi } from './services/api';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, setAuthenticated } = useAppStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Try to load credentials from storage
        const client = await (kimaiApi.constructor as any).fromStorage();
        
        if (client.isConfigured()) {
          // Test the connection to verify credentials are still valid
          try {
            await client.ping();
            setAuthenticated(true);
            setIsInitialized(true);
          } catch (error) {
            console.warn('Stored credentials are invalid:', error);
            setAuthenticated(false);
          }
        } else {
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [setAuthenticated]);

  const handleSetupComplete = () => {
    setAuthenticated(true);
    setIsInitialized(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-dark-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isInitialized) {
    return <SetupForm onComplete={handleSetupComplete} />;
  }

  return <TimerView />;
}

export default App;