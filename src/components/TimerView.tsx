import { useEffect, useState } from 'react';
import { Play, Pause, Plus, Settings, BarChart3, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import { useProjects, useActivities, useCustomers } from '../hooks/useKimaiApi';
import { ProjectSelector } from './ProjectSelector';
import { TimeEntryList } from './TimeEntryList';
import { CalendarView } from './CalendarView';
import { SystemTrayButton } from './SystemTrayButton';
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
      stopTimer();
      setDescription('');
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

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      {/* Header */}
      <div className="titlebar bg-dark-surface border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        
        <h1 className="text-lg font-semibold flex items-center space-x-2">
          <span>HiroTrack</span>
          <ChevronDown className="w-4 h-4" />
        </h1>
        
        <div className="flex items-center space-x-2">
          <SystemTrayButton />
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-60px)]">
        {/* Timer Section */}
        <div className="p-6 border-b border-gray-700">
          {/* Project Selection */}
          <div className="mb-6">
            <button
              onClick={() => setShowProjectSelector(true)}
              className="w-full text-left p-4 bg-dark-surface hover:bg-dark-surface-light rounded-lg border border-gray-600 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <span className="text-dark-text-secondary">
                  {getProjectDisplayName()}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Timer Display and Controls */}
          <div className="flex items-center justify-between">
            <div className="timer-display">
              {formatTime(timer.elapsedTime)}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleStartStop}
                disabled={!timer.currentEntry?.project && !timer.isRunning}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  timer.isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : timer.currentEntry?.project
                    ? 'bg-primary hover:bg-primary-light'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                {timer.isRunning ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" />
                )}
              </button>
              
              <button className="w-12 h-12 bg-dark-surface hover:bg-dark-surface-light rounded-full flex items-center justify-center border border-gray-600 transition-colors">
                <Plus className="w-5 h-5 text-gray-400" />
              </button>
            </div>
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
          <div className="flex items-center justify-between mt-6 text-sm">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 bg-dark-surface rounded border border-gray-600"></div>
              <div className="w-6 h-6 bg-dark-surface rounded border border-gray-600"></div>
              <div className="w-6 h-6 bg-dark-surface rounded border border-gray-600"></div>
            </div>
            <div className="text-right">
              <div className="text-dark-text-secondary">TODAY TOTAL</div>
              <div className="font-semibold">0:00:00</div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex bg-dark-surface rounded-lg p-1">
            <button
              onClick={() => setCurrentView('timer')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                currentView === 'timer'
                  ? 'bg-dark-surface-light text-dark-text'
                  : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
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
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-dark-text">TODAY TOTAL 0:00:00</span>
          </div>
          <button className="text-sm text-dark-text-secondary hover:text-dark-text flex items-center space-x-1">
            <span>DETAILED REPORTS ON WEB APP</span>
            <BarChart3 className="w-4 h-4" />
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