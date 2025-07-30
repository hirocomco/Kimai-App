import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kimaiApi, KimaiApiError, KimaiApiClient } from '../services/api';
import { Customer, Project, Activity } from '../store';

// Query keys
export const queryKeys = {
  ping: ['ping'] as const,
  version: ['version'] as const,
  customers: ['customers'] as const,
  customer: (id: number) => ['customers', id] as const,
  projects: (customerId?: number) => ['projects', customerId] as const,
  project: (id: number) => ['projects', id] as const,
  activities: (projectId?: number) => ['activities', projectId] as const,
  activity: (id: number) => ['activities', id] as const,
  timesheets: (params?: Record<string, any>) => ['timesheets', params] as const,
  timesheet: (id: number) => ['timesheets', id] as const,
};

// Connection hooks
export function usePing() {
  return useQuery({
    queryKey: queryKeys.ping,
    queryFn: () => kimaiApi.ping(),
    enabled: kimaiApi.isConfigured(),
    retry: false,
    staleTime: 0, // Always fresh for connection tests
  });
}

export function useVersion() {
  return useQuery({
    queryKey: queryKeys.version,
    queryFn: () => kimaiApi.getVersion(),
    enabled: kimaiApi.isConfigured(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Customer hooks
export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async () => {
      console.log('Fetching customers...');
      try {
        const result = await kimaiApi.getCustomers();
        console.log('Customers response:', result);
        console.log('Customers count:', result.length);
        if (result.length === 0) {
          console.warn('No customers found - your Kimai server might be empty or have permission issues');
        }
        return result;
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
    enabled: kimaiApi.isConfigured(),
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => kimaiApi.getCustomer(id),
    enabled: kimaiApi.isConfigured() && id > 0,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (customer: Omit<Customer, 'id'>) => kimaiApi.createCustomer(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to create customer:', error);
    },
  });
}

// Project hooks
export function useProjects(customerId?: number) {
  return useQuery({
    queryKey: queryKeys.projects(customerId),
    queryFn: async () => {
      console.log('Fetching projects...');
      try {
        const result = await kimaiApi.getProjects(customerId);
        console.log('Projects response:', result);
        console.log('Projects count:', result.length);
        if (result.length === 0) {
          console.warn('No projects found - check if projects exist in your Kimai server');
        }
        return result;
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    },
    enabled: kimaiApi.isConfigured(),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => kimaiApi.getProject(id),
    enabled: kimaiApi.isConfigured() && id > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (project: Omit<Project, 'id'>) => kimaiApi.createProject(project),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(newProject.customer.id) });
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to create project:', error);
    },
  });
}

// Activity hooks
export function useActivities(projectId?: number) {
  return useQuery({
    queryKey: queryKeys.activities(projectId),
    queryFn: () => kimaiApi.getActivities(projectId),
    enabled: kimaiApi.isConfigured(),
  });
}

export function useActivity(id: number) {
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => kimaiApi.getActivity(id),
    enabled: kimaiApi.isConfigured() && id > 0,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (activity: Omit<Activity, 'id'>) => kimaiApi.createActivity(activity),
    onSuccess: (newActivity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
      if (newActivity.project) {
        queryClient.invalidateQueries({ queryKey: queryKeys.activities(newActivity.project.id) });
      }
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to create activity:', error);
    },
  });
}

// Timesheet hooks
export function useTimesheets(params?: {
  user?: number;
  customer?: number;
  project?: number;
  activity?: number;
  begin?: string;
  end?: string;
  exported?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.timesheets(params),
    queryFn: () => kimaiApi.getTimesheets(params),
    enabled: kimaiApi.isConfigured(),
  });
}

export function useTimesheet(id: number) {
  return useQuery({
    queryKey: queryKeys.timesheet(id),
    queryFn: () => kimaiApi.getTimesheet(id),
    enabled: kimaiApi.isConfigured() && id > 0,
  });
}

export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (timeEntry: {
      begin: string;
      end?: string;
      project: number;
      activity: number;
      description?: string;
    }) => kimaiApi.createTimesheet(timeEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheets() });
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to create timesheet:', error);
    },
  });
}

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...timeEntry }: { id: number } & Partial<{
      begin: string;
      end: string;
      project: number;
      activity: number;
      description: string;
    }>) => kimaiApi.updateTimesheet(id, timeEntry),
    onSuccess: (updatedEntry) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheets() });
      if (updatedEntry.id) {
        queryClient.setQueryData(queryKeys.timesheet(updatedEntry.id), updatedEntry);
      }
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to update timesheet:', error);
    },
  });
}

export function useDeleteTimesheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => kimaiApi.deleteTimesheet(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timesheets() });
      queryClient.removeQueries({ queryKey: queryKeys.timesheet(deletedId) });
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to delete timesheet:', error);
    },
  });
}

// Authentication helpers
export function useTestConnection() {
  return useMutation({
    mutationFn: async ({ serverUrl, apiToken }: { serverUrl: string; apiToken: string }) => {
      // Create a temporary client to test the connection
      const testClient = new KimaiApiClient(serverUrl, apiToken);
      await testClient.ping();
      return { serverUrl, apiToken };
    },
    onError: (error: KimaiApiError) => {
      console.error('Connection test failed:', error);
    },
  });
}

export function useSaveCredentials() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ serverUrl, apiToken }: { serverUrl: string; apiToken: string }) => 
      kimaiApi.saveCredentials(serverUrl, apiToken),
    onSuccess: () => {
      // Invalidate all queries when credentials change
      queryClient.invalidateQueries();
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to save credentials:', error);
    },
  });
}

export function useClearCredentials() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => kimaiApi.clearCredentials(),
    onSuccess: () => {
      // Clear all cached data when credentials are cleared
      queryClient.clear();
    },
    onError: (error: KimaiApiError) => {
      console.error('Failed to clear credentials:', error);
    },
  });
}