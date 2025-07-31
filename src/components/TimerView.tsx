import { useEffect, useState } from 'react';
import { Play, Square, Settings, BarChart3, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import { useProjects, useActivities, useCustomers, useCreateTimesheet } from '../hooks/useKimaiApi';
import { KimaiApiClient } from '../services/api';
import { ProjectSelector } from './ProjectSelector';
import { TimeEntryList } from './TimeEntryList';
import { CalendarView } from './CalendarView';
import { SettingsModal } from './SettingsModal';
import { ApiTester } from './ApiTester';

export function TimerView() {
  const {
    timer,
    startTimer,
    stopTimer,
    updateElapsedTime,
    setTimerEntry,
    currentView,
    setCurrentView,
  } = useAppStore();

  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [description, setDescription] = useState('');

  // Query data
  const { data: customers = [] } = useCustomers();
  const { data: projects = [] } = useProjects();
  const { data: activities = [] } = useActivities();
  
  // Mutation for creating timesheets
  const createTimesheet = useCreateTimesheet();

  // Update elapsed time every second when timer is running
  useEffect(() => {
    let interval: number;
    
    if (timer.isRunning) {
      interval = setInterval(() => {
        updateElapsedTime();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, updateElapsedTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (timer.isRunning) {
      const timeEntry = stopTimer();
      setDescription('');
      
      // Submit to Kimai server if we have a valid time entry
      if (timeEntry && timeEntry.project && timeEntry.activity) {
        const kimaiTimeEntry = {
          begin: KimaiApiClient.formatDateForApi(new Date(timeEntry.begin)),
          end: KimaiApiClient.formatDateForApi(new Date(timeEntry.end!)),
          project: timeEntry.project.id,
          activity: timeEntry.activity.id,
          description: timeEntry.description || '',
        };
        
        console.log('Submitting time entry to Kimai:', kimaiTimeEntry);
        createTimesheet.mutate(kimaiTimeEntry, {
          onSuccess: (createdEntry) => {
            console.log('Time entry created successfully:', createdEntry);
          },
          onError: (error) => {
            console.error('Failed to submit time entry to Kimai server:', error);
          },
        });
      }
    } else {
      if (!timer.currentEntry?.project || !timer.currentEntry?.activity) {
        setShowProjectSelector(true);
        return;
      }

      startTimer({
        ...timer.currentEntry,
        description,
      });
    }
  };

  const handleProjectSelect = (project: any, activity: any) => {
    setTimerEntry({
      project,
      activity,
      description,
    });
    setShowProjectSelector(false);
  };

  const getProjectDisplayName = () => {
    if (!timer.currentEntry?.project) return 'Select project and activity';
    
    const project = timer.currentEntry.project;
    const activity = timer.currentEntry.activity;
    
    // Find customer name - handle different possible data structures
    let customerName = 'Unknown';
    if (project.customer && typeof project.customer === 'object') {
      customerName = project.customer.name;
    } else if (typeof project.customer === 'number') {
      const customer = customers.find(c => c.id === project.customer);
      customerName = customer?.name || 'Unknown';
    } else if (project.customerId) {
      const customer = customers.find(c => c.id === project.customerId);
      customerName = customer?.name || 'Unknown';
    }
    
    return `${customerName} / ${project.name} / ${activity?.name || 'Unknown'}`;
  };

  const getCustomerInitial = () => {
    if (!timer.currentEntry?.project) return 'P';
    
    const project = timer.currentEntry.project;
    let customerName = 'P';
    
    if (project.customer && typeof project.customer === 'object') {
      customerName = project.customer.name;
    } else if (typeof project.customer === 'number') {
      const customer = customers.find(c => c.id === project.customer);
      customerName = customer?.name || 'P';
    } else if (project.customerId) {
      const customer = customers.find(c => c.id === project.customerId);
      customerName = customer?.name || 'P';
    }
    
    return customerName.charAt(0).toUpperCase();
  };

  const getProjectColor = () => {
    if (!timer.currentEntry?.project) return '#ec4899'; // fallback to primary color
    return timer.currentEntry.project.color || '#ec4899';
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      {/* Header */}
      <div className="bg-dark-bg px-3 py-2 flex items-center justify-end">
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-60px)]">
        {/* Timer Section - Single Line Layout */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            {/* Project Selection Button */}
            <button
              onClick={() => setShowProjectSelector(true)}
              className="text-left p-2 bg-dark-surface hover:bg-dark-surface-light rounded-lg transition-colors flex items-center space-x-2 flex-1 min-w-0"
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: getProjectColor() }}
              >
                {getCustomerInitial()}
              </div>
              <span className="text-xs text-dark-text-secondary truncate">
                {getProjectDisplayName()}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </button>

            {/* Timer Display */}
            <div className="timer-display text-center mx-3 text-xl font-mono">
              {formatTime(timer.elapsedTime)}
            </div>
            
            {/* Play/Stop Button */}
            <button
              onClick={handleStartStop}
              disabled={!timer.currentEntry?.project && !timer.isRunning}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                timer.isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : timer.currentEntry?.project
                  ? 'bg-primary hover:bg-primary-light'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {timer.isRunning ? (
                <Square className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Description Input */}
          <div className="mt-4">
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (timer.currentEntry) {
                  setTimerEntry({ ...timer.currentEntry, description: e.target.value });
                }
              }}
              placeholder="What are you working on?"
              className="input-field w-full"
            />
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-end mt-3 text-xs">
            <div className="text-right">
              <div className="text-xs text-dark-text-secondary">TODAY TOTAL</div>
              <div className="text-xs font-medium">0:00:00</div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-3 px-4">
          <div className="flex bg-dark-surface rounded-lg p-1">
            <button
              onClick={() => setCurrentView('timer')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                currentView === 'timer'
                  ? 'bg-dark-surface-light text-dark-text'
                  : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                currentView === 'history'
                  ? 'bg-dark-surface-light text-dark-text'
                  : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="mb-3 px-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-dark-text">TODAY TOTAL 0:00:00</span>
          </div>
          <button className="text-xs text-dark-text-secondary hover:text-dark-text flex items-center space-x-1">
            <span>DETAILED REPORTS ON WEB APP</span>
            <BarChart3 className="w-3 h-3" />
          </button>
        </div>

        {/* Time Entries List/Calendar */}
        <div className="flex-1 overflow-auto">
          {currentView === 'timer' ? <TimeEntryList /> : <CalendarView />}
        </div>
      </div>

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <ProjectSelector
          customers={customers}
          projects={projects}
          activities={activities}
          onSelect={handleProjectSelect}
          onClose={() => setShowProjectSelector(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Debug API Tester */}
      <ApiTester />
    </div>
  );
}