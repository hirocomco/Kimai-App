import React, { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useTimesheets } from '../hooks/useKimaiApi';
import { useAppStore } from '../store';

export function CalendarView() {
  const [currentWeek, setCurrentWeek] = React.useState(new Date());
  const { startTimer } = useAppStore();

  // Calculate week boundaries
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get timesheets for the current week
  const weekStartWithTime = new Date(weekStart);
  weekStartWithTime.setHours(0, 0, 0, 0);
  const weekEndWithTime = new Date(weekEnd);
  weekEndWithTime.setHours(23, 59, 59, 999);
  
  const { data: timesheets = [], isLoading } = useTimesheets({
    begin: weekStartWithTime.toISOString().slice(0, 19), // Remove milliseconds and Z
    end: weekEndWithTime.toISOString().slice(0, 19),
  });

  // Group timesheets by date
  const timeEntriesByDate = useMemo(() => {
    const groups: { [date: string]: typeof timesheets } = {};
    
    timesheets.forEach((entry) => {
      const date = format(new Date(entry.begin), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    // Sort each group by start time
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(a.begin).getTime() - new Date(b.begin).getTime());
    });

    return groups;
  }, [timesheets]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
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

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-flex items-center space-x-2 text-dark-text-secondary">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-dark-text" />
          </button>
          
          <h2 className="text-lg font-semibold text-dark-text">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-dark-text" />
          </button>
        </div>

        <button
          onClick={goToCurrentWeek}
          className="btn-secondary text-sm"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-h-full">
          {daysInWeek.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const entries = timeEntriesByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={index}
                className={`border-r border-gray-700 flex flex-col ${
                  index === 6 ? 'border-r-0' : ''
                }`}
              >
                {/* Day Header */}
                <div className={`p-3 border-b border-gray-700 ${
                  isToday ? 'bg-primary/10' : 'bg-dark-surface'
                }`}>
                  <div className="text-xs text-dark-text-secondary font-medium">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday ? 'text-primary' : 'text-dark-text'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {entries.length > 0 && (
                    <div className="text-xs text-dark-text-secondary mt-1">
                      {getTotalForDate(entries)}
                    </div>
                  )}
                </div>

                {/* Day Content */}
                <div className="flex-1 p-2 space-y-1">
                  {entries.map((entry, entryIndex) => (
                    <button
                      key={entry.id || entryIndex}
                      onClick={() => handleRestartEntry(entry)}
                      className="w-full text-left p-2 bg-dark-surface hover:bg-dark-surface-light rounded text-xs transition-colors"
                      title={`Click to restart: ${entry.project.customer?.name} / ${entry.project.name} / ${entry.activity.name}`}
                    >
                      <div className="flex items-center space-x-1 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.project.color || '#6b7280' }}
                        />
                        <span className="font-medium text-dark-text truncate">
                          {entry.activity.name}
                        </span>
                      </div>
                      
                      <div className="text-dark-text-secondary truncate">
                        {entry.project.customer?.name} / {entry.project.name}
                      </div>
                      
                      {entry.description && (
                        <div className="text-dark-text-secondary truncate mt-1">
                          {entry.description}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-dark-text-secondary">
                          {format(new Date(entry.begin), 'HH:mm')}
                          {entry.end && ` - ${format(new Date(entry.end), 'HH:mm')}`}
                        </span>
                        <span className="font-mono text-dark-text">
                          {formatTime(entry.duration || 0)}
                        </span>
                      </div>
                    </button>
                  ))}
                  
                  {entries.length === 0 && (
                    <div className="text-center py-8 text-dark-text-secondary text-xs">
                      No entries
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}