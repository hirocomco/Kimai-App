import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { systemService } from '../services/system';

// Types for our data models
export interface Customer {
  id: number;
  name: string;
  company?: string;
  visible: boolean;
}

export interface Project {
  id: number;
  name: string;
  customer: Customer;
  visible: boolean;
  color?: string;
}

export interface Activity {
  id: number;
  name: string;
  project?: Project;
  visible: boolean;
  color?: string;
}

export interface TimeEntry {
  id?: number;
  begin: string; // ISO 8601 format
  end?: string;  // ISO 8601 format for completed entries
  project: Project;
  activity: Activity;
  description?: string;
  duration?: number; // in seconds
  rate?: number;
  user?: number;
}

// API response format where project/activity are IDs
export interface TimeEntryApiResponse {
  id: number;
  begin: string;
  end?: string;
  project: number; // Project ID
  activity: number; // Activity ID
  description?: string;
  duration?: number;
  rate?: number;
  user?: number;
}

export interface Timer {
  isRunning: boolean;
  startTime: Date | null;
  currentEntry: Partial<TimeEntry> | null;
  elapsedTime: number; // in seconds
}

export interface Settings {
  serverUrl: string;
  apiToken: string;
  autoStart: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  minimizeToTray: boolean;
}

// Main application store
interface AppStore {
  // Authentication & Settings
  settings: Settings;
  isAuthenticated: boolean;
  isConnecting: boolean;
  
  // Timer state
  timer: Timer;
  
  // Data
  customers: Customer[];
  projects: Project[];
  activities: Activity[];
  timeEntries: TimeEntry[];
  
  // UI state
  currentView: 'timer' | 'history' | 'settings';
  sidebarOpen: boolean;
  
  // Actions
  setSettings: (settings: Partial<Settings>) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  
  // Timer actions
  startTimer: (entry: Partial<TimeEntry>) => void;
  stopTimer: () => TimeEntry | null;
  updateElapsedTime: () => void;
  setTimerEntry: (entry: Partial<TimeEntry>) => void;
  
  // Data actions
  setCustomers: (customers: Customer[]) => void;
  setProjects: (projects: Project[]) => void;
  setActivities: (activities: Activity[]) => void;
  addTimeEntry: (entry: TimeEntry) => void;
  updateTimeEntry: (id: number, entry: Partial<TimeEntry>) => void;
  
  // UI actions
  setCurrentView: (view: 'timer' | 'history' | 'settings') => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      settings: {
        serverUrl: '',
        apiToken: '',
        autoStart: false,
        theme: 'dark',
        notifications: true,
        minimizeToTray: true,
      },
      isAuthenticated: false,
      isConnecting: false,
      
      timer: {
        isRunning: false,
        startTime: null,
        currentEntry: null,
        elapsedTime: 0,
      },
      
      customers: [],
      projects: [],
      activities: [],
      timeEntries: [],
      
      currentView: 'timer',
      sidebarOpen: false,
      
      // Actions
      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      
      setAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),
      
      setConnecting: (connecting) =>
        set({ isConnecting: connecting }),
      
      // Timer actions
      startTimer: (entry) => {
        const startTime = new Date();
        set({
          timer: {
            isRunning: true,
            startTime,
            currentEntry: entry,
            elapsedTime: 0,
          },
        });

        // Show notification
        if (entry.project && entry.activity) {
          const projectName = `${entry.project.customer?.name || 'Unknown'} / ${entry.project.name}`;
          systemService.showNotification(
            'Timer Started',
            `${projectName} / ${entry.activity.name}`
          );

          // Update tray tooltip
          systemService.updateTrayTooltip(
            `Kimai Desktop - Tracking: ${projectName} / ${entry.activity.name}`
          );
        }
      },
      
      stopTimer: () => {
        const { timer } = get();
        if (timer.isRunning && timer.startTime && timer.currentEntry) {
          const endTime = new Date();
          const duration = Math.floor((endTime.getTime() - timer.startTime.getTime()) / 1000);
          
          const timeEntry: TimeEntry = {
            begin: timer.startTime.toISOString(),
            end: endTime.toISOString(),
            duration,
            project: timer.currentEntry.project!,
            activity: timer.currentEntry.activity!,
            description: timer.currentEntry.description,
          };

          // Format duration for display
          const hours = Math.floor(duration / 3600);
          const minutes = Math.floor((duration % 3600) / 60);
          const durationText = `${hours}h ${minutes}m`;

          // Show notification
          const projectName = `${timer.currentEntry.project?.customer?.name || 'Unknown'} / ${timer.currentEntry.project?.name}`;
          systemService.showNotification(
            'Timer Stopped',
            `${projectName} / ${timer.currentEntry.activity?.name} - ${durationText}`
          );

          // Reset tray tooltip
          systemService.updateTrayTooltip('Kimai Desktop - Time Tracker');
          
          // Reset timer state
          set({
            timer: {
              isRunning: false,
              startTime: null,
              currentEntry: null,
              elapsedTime: 0,
            },
          });
          
          return timeEntry;
        }
        
        set({
          timer: {
            isRunning: false,
            startTime: null,
            currentEntry: null,
            elapsedTime: 0,
          },
        });

        // Reset tray tooltip
        systemService.updateTrayTooltip('Kimai Desktop - Time Tracker');
        
        return null;
      },
      
      updateElapsedTime: () => {
        const { timer } = get();
        if (timer.isRunning && timer.startTime) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000);
          set((state) => ({
            timer: { ...state.timer, elapsedTime: elapsed },
          }));
        }
      },
      
      setTimerEntry: (entry) =>
        set((state) => ({
          timer: {
            ...state.timer,
            currentEntry: { ...state.timer.currentEntry, ...entry },
          },
        })),
      
      // Data actions
      setCustomers: (customers) => set({ customers }),
      setProjects: (projects) => set({ projects }),
      setActivities: (activities) => set({ activities }),
      
      addTimeEntry: (entry) =>
        set((state) => ({
          timeEntries: [entry, ...state.timeEntries],
        })),
      
      updateTimeEntry: (id, entry) =>
        set((state) => ({
          timeEntries: state.timeEntries.map((te) =>
            te.id === id ? { ...te, ...entry } : te
          ),
        })),
      
      // UI actions
      setCurrentView: (view) => set({ currentView: view }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'kimai-desktop-store',
    }
  )
);