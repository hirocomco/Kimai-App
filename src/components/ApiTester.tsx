import { kimaiApi } from '../services/api';

export function ApiTester() {
  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  const testDirectApiCall = async () => {
    console.log('=== DIRECT API TESTING ===');
    
    try {
      // Force initialization
      await kimaiApi.forceInitialize();
      
      const client = kimaiApi.getClient();
      console.log('API Base URL:', client['baseUrl']);
      console.log('API Token configured:', kimaiApi.isConfigured());
      
      // Test ping
      console.log('Testing /api/ping...');
      const pingResult = await kimaiApi.ping();
      console.log('Ping result:', pingResult);
      
      // Test version
      console.log('Testing /api/version...');
      const versionResult = await kimaiApi.getVersion();
      console.log('Version result:', versionResult);
      
      // Test using the API client directly
      console.log('=== Testing API Client Methods ===');
      const customersResult = await kimaiApi.getCustomers();
      console.log('Customers response:', customersResult);
      
      const projectsResult = await kimaiApi.getProjects();
      console.log('Projects response:', projectsResult);
      
      const activitiesResult = await kimaiApi.getActivities();
      console.log('Activities response:', activitiesResult);
      
      if (customersResult.length > 0) {
        console.log('===== CUSTOMERS STRUCTURE =====');
        console.log('First customer keys:', Object.keys(customersResult[0]));
        console.log('First customer data:', JSON.stringify(customersResult[0], null, 2));
      }
      
      if (projectsResult.length > 0) {
        console.log('===== PROJECTS STRUCTURE =====');
        console.log('First project keys:', Object.keys(projectsResult[0]));
        console.log('First project data:', JSON.stringify(projectsResult[0], null, 2));
      }
      
      if (activitiesResult.length > 0) {
        console.log('===== ACTIVITIES STRUCTURE =====');
        console.log('First activity keys:', Object.keys(activitiesResult[0]));
        console.log('First activity data:', JSON.stringify(activitiesResult[0], null, 2));
      }

      
    } catch (error) {
      console.error('API Test Error:', error);
    }
  };

  return (
    <button
      onClick={testDirectApiCall}
      className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm z-50"
    >
      Test API
    </button>
  );
}