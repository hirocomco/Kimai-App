import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Clock, Play } from 'lucide-react';
import { useTimesheets, useCustomers, useProjects, useActivities } from '../hooks/useKimaiApi';
import { useAppStore } from '../store';

export function TimeEntryList() {
  const { startTimer } = useAppStore();
  
  // Query data
  const { data: customers = [] } = useCustomers();
  const { data: projects = [] } = useProjects();
  const { data: activities = [] } = useActivities();
  
  // Get recent timesheets (last 7 days)
  const beginDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  beginDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const { data: timesheets = [], isLoading, error } = useTimesheets({
    begin: beginDate.toISOString().slice(0, 19), // Remove milliseconds and Z
    end: endDate.toISOString().slice(0, 19),
  });

  // Helper function to enrich timesheet entries with full objects
  const enrichedTimesheets = React.useMemo(() => {
    return timesheets.map(entry => {
      // Look up full project object by ID
      const project = projects.find(p => p.id === entry.project);
      // Look up full activity object by ID  
      const activity = activities.find(a => a.id === entry.activity);
      
      // For project, we also need to look up the customer
      let enrichedProject = project;
      if (project && typeof project.customer === 'number') {
        const customer = customers.find(c => c.id === project.customer);
        enrichedProject = { ...project, customer: customer || { id: project.customer, name: 'Unknown Customer', visible: true } };
      }
      
      return {
        ...entry,
        project: enrichedProject || { id: entry.project, name: 'Unknown Project', customer: { id: 0, name: 'Unknown Customer', visible: true }, visible: true, color: '#6b7280' },
        activity: activity || { id: entry.activity, name: 'Unknown Activity', visible: true, color: '#6b7280' }
      };
    });
  }, [timesheets, customers, projects, activities]);

  // Group enriched timesheets by date
  const groupedEntries = React.useMemo(() => {
    const groups: { [date: string]: typeof enrichedTimesheets } = {};
    
    enrichedTimesheets.forEach((entry) => {
      const date = format(new Date(entry.begin), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    // Sort each group by start time (newest first)
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(b.begin).getTime() - new Date(a.begin).getTime());
    });

    return groups;
  }, [enrichedTimesheets]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '00:00:00';
    return formatTime(duration);
  };

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  };

  const getTotalForDate = (entries: typeof timesheets): string => {
    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return formatTime(totalSeconds);
  };

  const handleRestartEntry = (entry: typeof timesheets[0]) => {
    startTimer({
      project: entry.project,
      activity: entry.activity,
      description: entry.description,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-flex items-center space-x-2 text-dark-text-secondary">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Loading time entries...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-400 text-sm">
          Failed to load time entries: {error.message}
        </div>
      </div>
    );
  }

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (sortedDates.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-dark-text-secondary opacity-50" />
        <h3 className="text-lg font-medium text-dark-text mb-2">No time entries yet</h3>
        <p className="text-dark-text-secondary">
          Start your first timer to see entries here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-700">
      {sortedDates.map((dateStr) => {
        const entries = groupedEntries[dateStr];
        return (
          <div key={dateStr} className="p-3">
            {/* Date Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-dark-text">
                {getDateLabel(dateStr)}
              </h3>
              <div className="text-xs text-dark-text font-medium">
                {getTotalForDate(entries)}
              </div>
            </div>

            {/* Time Entries */}
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-dark-surface rounded-lg p-2 hover:bg-dark-surface-light transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {/* Project Icon */}
                      <div className="w-5 h-5 bg-dark-bg rounded flex items-center justify-center text-xs font-bold text-dark-text flex-shrink-0">
                        {entry.project.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Project/Activity Info */}
                      <div className="flex-1 min-w-0">
                        {/* First row: Project title and duration */}
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="text-xs text-dark-text font-medium truncate">
                            {entry.project.customer.name} / {entry.project.name} / {entry.activity.name}
                          </div>
                          <div className="text-xs text-dark-text font-mono ml-2 flex-shrink-0">
                            {formatDuration(entry.duration)}
                          </div>
                        </div>
                        
                        {/* Second row: Color dot + description */}
                        <div className="flex items-center space-x-1 text-xs text-dark-text-secondary mb-0.5">
                          <div 
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: entry.project.color || '#6b7280' }}
                          />
                          <span className="truncate">{entry.description || 'No Description'}</span>
                        </div>
                        
                        {/* Third row: Time range */}
                        <div className="text-xs text-dark-text-secondary">
                          {format(new Date(entry.begin), 'HH:mm')} - {entry.end ? format(new Date(entry.end), 'HH:mm') : 'Running'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}