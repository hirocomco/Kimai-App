import React, { useState, useMemo } from 'react';
import { Search, X, Building2, Folder, Activity } from 'lucide-react';
import { Customer, Project, Activity as ActivityType } from '../store';

interface ProjectSelectorProps {
  customers: Customer[];
  projects: Project[];
  activities: ActivityType[];
  onSelect: (project: Project, activity: ActivityType) => void;
  onClose: () => void;
}

export function ProjectSelector({ customers, projects, activities, onSelect, onClose }: ProjectSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Debug logging
  React.useEffect(() => {
    console.log('ProjectSelector - customers:', customers.length);
    console.log('ProjectSelector - projects:', projects.length);
    console.log('ProjectSelector - activities:', activities.length);
    
    if (customers.length > 0) {
      console.log('First customer:', customers[0]);
    }
    if (projects.length > 0) {
      console.log('First project:', projects[0]);
    }
    if (activities.length > 0) {
      console.log('First activity:', activities[0]);
    }
  }, [customers, projects, activities]);

  // Filter and organize data
  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    console.log('Filtering data - customers:', customers.length, 'projects:', projects.length);
    
    // Group projects by customer
    const customerGroups = customers.filter(customer => {
      // Handle different possible field names for visibility
      const isVisible = customer.visible !== false && customer.enabled !== false;
      console.log('Customer visible check:', customer.name, 'visible:', customer.visible, 'enabled:', customer.enabled, 'isVisible:', isVisible);
      return isVisible;
    }).map(customer => {
      const customerProjects = projects.filter(project => {
        // Handle different possible field names for visibility
        const visibleCheck = project.visible !== false && project.enabled !== false;
        
        // Handle different possible customer reference structures
        let customerIdCheck = false;
        if (project.customer && typeof project.customer === 'object') {
          // Full customer object
          customerIdCheck = project.customer.id === customer.id;
        } else if (typeof project.customer === 'number') {
          // Just customer ID
          customerIdCheck = project.customer === customer.id;
        } else if (project.customerId) {
          // Alternative field name
          customerIdCheck = project.customerId === customer.id;
        }
        
        const searchCheck = searchLower === '' || 
         customer.name.toLowerCase().includes(searchLower) ||
         project.name.toLowerCase().includes(searchLower);
        
        console.log(`Project ${project.name}: visible=${visibleCheck}, customerMatch=${customerIdCheck}, searchMatch=${searchCheck}`);
        console.log(`  project.customer:`, project.customer);
        console.log(`  project.customerId:`, project.customerId);
        console.log(`  comparing customer.id=${customer.id}`);
        
        return visibleCheck && customerIdCheck && searchCheck;
      });

      console.log(`Customer ${customer.name} has ${customerProjects.length} projects`);

      return {
        customer,
        projects: customerProjects,
      };
    }).filter(group => group.projects.length > 0);

    console.log('Final filtered groups:', customerGroups.length);
    
    // If no customer groups found but we have projects, create a fallback group
    if (customerGroups.length === 0 && projects.length > 0) {
      console.log('No customer groups found, creating fallback group for all projects');
      const fallbackCustomer = { id: -1, name: 'All Projects', visible: true };
      const fallbackGroup = {
        customer: fallbackCustomer,
        projects: projects.filter(project => 
          (project.visible !== false && project.enabled !== false) &&
          (searchLower === '' || project.name.toLowerCase().includes(searchLower))
        ),
      };
      console.log('Fallback group has', fallbackGroup.projects.length, 'projects');
      if (fallbackGroup.projects.length > 0) {
        return [fallbackGroup];
      }
    }
    
    return customerGroups;
  }, [customers, projects, searchTerm]);

  // Get activities for selected project
  const projectActivities = useMemo(() => {
    if (!selectedProject) return [];
    
    return activities.filter(activity => {
      // Handle different possible field names for visibility
      const visibleCheck = activity.visible !== false && activity.enabled !== false;
      
      // Handle different possible project reference structures
      let projectIdCheck = true; // Default to true for global activities
      if (activity.project && typeof activity.project === 'object') {
        // Full project object
        projectIdCheck = activity.project.id === selectedProject.id;
      } else if (typeof activity.project === 'number') {
        // Just project ID
        projectIdCheck = activity.project === selectedProject.id;
      } else if (activity.projectId) {
        // Alternative field name
        projectIdCheck = activity.projectId === selectedProject.id;
      }
      
      return visibleCheck && projectIdCheck;
    });
  }, [activities, selectedProject]);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  const handleActivitySelect = (activity: ActivityType) => {
    if (selectedProject) {
      onSelect(selectedProject, activity);
    }
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-surface rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-text flex items-center space-x-2">
            {selectedProject ? (
              <>
                <button
                  onClick={handleBackToProjects}
                  className="p-1 hover:bg-dark-surface-light rounded transition-colors"
                >
                  ←
                </button>
                <Activity className="w-5 h-5" />
                <span>Select Activity</span>
              </>
            ) : (
              <>
                <Folder className="w-5 h-5" />
                <span>Select Project</span>
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-surface-light rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        {!selectedProject && (
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customers and projects..."
                className="input-field pl-10 w-full"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {selectedProject ? (
            /* Activity Selection */
            <div className="space-y-2">
              <div className="mb-4 p-3 bg-dark-bg rounded-lg">
                <div className="text-sm text-dark-text-secondary">Selected Project</div>
                <div className="font-medium text-dark-text">
                  {selectedProject.customer.name} / {selectedProject.name}
                </div>
              </div>

              {projectActivities.length > 0 ? (
                projectActivities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => handleActivitySelect(activity)}
                    className="w-full p-4 bg-dark-bg hover:bg-dark-surface-light rounded-lg text-left transition-colors border border-gray-700 hover:border-primary/30"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: activity.color || '#6b7280' }}
                      />
                      <div>
                        <div className="font-medium text-dark-text">{activity.name}</div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-dark-text-secondary">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activities found for this project</p>
                </div>
              )}
            </div>
          ) : (
            /* Project Selection */
            <div className="space-y-4">
              {filteredData.length > 0 ? (
                filteredData.map((group) => (
                  <div key={group.customer.id} className="space-y-2">
                    {/* Customer Header */}
                    <div className="flex items-center space-x-2 text-sm text-dark-text-secondary font-medium">
                      <Building2 className="w-4 h-4" />
                      <span>{group.customer.name}</span>
                    </div>

                    {/* Projects */}
                    <div className="space-y-2 ml-6">
                      {group.projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project)}
                          className="w-full p-3 bg-dark-bg hover:bg-dark-surface-light rounded-lg text-left transition-colors border border-gray-700 hover:border-primary/30"
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.color || '#6b7280' }}
                            />
                            <div>
                              <div className="font-medium text-dark-text">{project.name}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-dark-text-secondary">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No projects found</p>
                  {searchTerm && (
                    <p className="text-sm mt-2">Try adjusting your search terms</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-xs text-dark-text-secondary">
            {selectedProject
              ? 'Select an activity to start tracking time'
              : 'Select a project to see available activities'
            }
          </p>
        </div>
      </div>
    </div>
  );
}