import React, { useState, useEffect } from 'react';
import { Plus, Users, Tag, Briefcase, AppWindow, GitCommit, FolderOpen } from 'lucide-react';
import EmployeesTab from '../components/AdminPanel/EmployeesTab';
import TagsTab from '../components/AdminPanel/TagsTab';
import WorkgroupsTab from '../components/AdminPanel/WorkgroupsTab';
import ModulesTab from '../components/AdminPanel/ModulesTab';
import WorkflowsTab from '../components/AdminPanel/WorkflowsTab';
import ProjectsTab from '../components/AdminPanel/ProjectsTab';
import {
  EmployeesTabSkeleton,
  TagsTabSkeleton,
  WorkgroupsTabSkeleton,
  ModulesTabSkeleton,
  WorkflowsTabSkeleton,
  ProjectsTabSkeleton,
} from '../components/AdminPanel/TabSkeletons';
import EmployeeModal from '../components/AdminPanel/EmployeeModal';
import CreateModal from '../components/AdminPanel/CreateModal';
import CreateWorkflowModal from '../components/AdminPanel/CreateWorkflowModal';
import ProjectModal from '../components/AdminPanel/ProjectModal';
import ConfirmationModal from '../components/AdminPanel/ConfirmationModal';
import AlertModal from '../components/AdminPanel/AlertModal';
import fetchWithAuth from '../utils/fetchWithAuth';

const WORKFLOW_LIST_ENDPOINT = 'http://localhost:8000/api/workflow_management/list';
const PROJECT_LIST_ENDPOINT = 'http://localhost:8000/api/projects/list';

const isTruthyProjectActive = (value) =>
  value === true || value === 1 || value === '1' || value === 'true';

const normalizeProject = (project) => ({
  ...project,
  active: isTruthyProjectActive(project?.active),
  workgroup_count: Number.parseInt(project?.workgroup_count ?? project?.workgroupCount ?? 0, 10) || 0,
  workflow_count: Number.parseInt(project?.workflow_count ?? project?.workflowCount ?? 0, 10) || 0,
});

const isTruthyEmployeeActive = (value) =>
  value === true || value === 1 || value === '1' || value === 'true';

const sameMembers = (left = [], right = []) => {
  if (left.length !== right.length) return false;

  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
};

const parseApiResponse = async (response, fallbackMessage) => {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || result.message || fallbackMessage);
  }

  return result;
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [tags, setTags] = useState([]);
  const [modules, setModules] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [projectToggleTarget, setProjectToggleTarget] = useState(null);
  const [isProjectSaving, setIsProjectSaving] = useState(false);
  const [isProjectDetailLoading, setIsProjectDetailLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, tagsRes, wgRes, modRes, wfRes, projectsRes, rolesRes] = await Promise.all([
        fetch('http://localhost:8000/api/employees'),
        fetchWithAuth('http://localhost:8000/api/tags'),
        fetch('http://localhost:8000/api/workgroups'),
        fetch('http://localhost:8000/api/modules'),
        fetch(WORKFLOW_LIST_ENDPOINT),
        fetchWithAuth(PROJECT_LIST_ENDPOINT),
        fetch('http://localhost:8000/api/employees/roles')
      ]);

      setEmployees(await empRes.json());
      setTags(await tagsRes.json());
      setWorkgroups(await wgRes.json());
      setModules(await modRes.json());
      setWorkflows(await wfRes.json());
      setProjects((await projectsRes.json()).map(normalizeProject));
      setRoles(await rolesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshWorkflows = async () => {
    try {
      const wfRes = await fetch(WORKFLOW_LIST_ENDPOINT);
      const data = await wfRes.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error refreshing workflows:', error);
    }
  };

  const refreshProjects = async () => {
    try {
      const res = await fetchWithAuth(PROJECT_LIST_ENDPOINT);
      if (!res.ok) throw new Error('Failed to refresh projects');
      const data = await res.json();
      const normalized = data.map(normalizeProject);
      setProjects(normalized);
      return normalized;
    } catch (error) {
      console.error('Error refreshing projects:', error);
      return null;
    }
  };

  const saveWorkflow = async (wf) => {
    try {
      const normalizeCategoryCode = (value) => {
        const parsed = Number.parseInt(value, 10);
        if (parsed === 90) return 40;
        if ([10, 20, 30, 40].includes(parsed)) return parsed;
        return 10;
      };

      const payload = {
        name: wf.name,
        steps: wf.steps.map(step => ({
          stepName: step.stepName || step.step_name,
          stepCode: step.stepCode || step.step_code,
          categoryCode: normalizeCategoryCode(step.categoryCode ?? step.category_code),
          workgroupCode: step.workgroupCode || step.workgroup_code,
          allowedNextSteps: step.allowedNextSteps || [],
          allowedPreviousSteps: step.allowedPreviousSteps || []
        }))
      };

      if (!wf.id) {
        console.log('[AdminPanel] workflow create payload:', payload);
        const res = await fetch('http://localhost:8000/api/workflow_management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log('[AdminPanel] workflow create status:', res.status);
        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody.detail || errorBody.error || 'Failed to create workflow');
        }
        showToast('Workflow created successfully');
      } else {
        const res = await fetch(`http://localhost:8000/api/workflow_management/${wf.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: wf.id, ...payload })
        });
        console.log('[AdminPanel] workflow update status:', res.status);
        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody.detail || errorBody.error || 'Failed to update workflow');
        }
        showToast('Workflow updated successfully');
      }

      await refreshWorkflows();
      setShowCreateWorkflowModal(false);
      setWorkflowToEdit(null);
    } catch (error) {
      console.error('Error saving workflow:', error);
      showToast(error.message || 'Failed to save workflow', 'error');
    }
  };

  // ---------- Editing Handlers ----------
  const handleEdit = (item) => {
    setEditingItem(item.id);

    if (activeTab === 'employees') {
      setEditForm({
        id: item.id,
        name: item.name || '',
        email: item.email || '',
        workgroup_code: item.workgroupId || item.workgroup_code || '',
        role_id: item.roleId || item.role_id || 3,
        active: isTruthyEmployeeActive(item.active),
        password: '',
      });
      setShowEmployeeModal(true);
      return;
    }

    if (activeTab === 'tags') {
      setEditForm({
        id: item.id,
        label: item.label || '',
        color: item.color || '#666666'
      });
      return;
    }

    setEditForm({
      id: item.id,
      name: item.name,
      email: item.email,
      workgroup_code: item.workgroupId || '',
      role_id: item.roleId || 3,
      active: item.active === 1 ? 1 : 0,
      description: item.description || '',
    });
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'tags') {
        const payload = {
          label: editForm.label,
          color: editForm.color
        };

        const response = await fetch(`http://localhost:8000/api/tags/${editForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Failed to update tag');
        }

        setTags(prev =>
          prev.map(tag =>
            tag.id === editForm.id
              ? { ...tag, label: editForm.label, color: editForm.color }
              : tag
          )
        );

        setEditingItem(null);
        setEditForm({});
        showToast('Tag updated successfully');
        return;
      }

      if (editForm.password && editForm.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const payload = {
        name: editForm.name,
        email: editForm.email,
        workgroupId: editForm.workgroup_code || null,
        roleId: editForm.role_id || 3,
        active: !!editForm.active,
        ...(editForm.password ? { password: editForm.password } : {})
      };

      const response = await fetch(`http://localhost:8000/api/employees/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to update employee');
      }

      // Fetch updated employee from backend to get roleName/workgroupName
      const updatedEmployeeRes = await fetch(`http://localhost:8000/api/employees/${editForm.id}`);
      const updatedEmployee = await updatedEmployeeRes.json();

      setEmployees(prev =>
        prev.map(emp => (emp.id === editForm.id ? updatedEmployee : emp))
      );

      setEditingItem(null);
      setEditForm({});
      setShowEmployeeModal(false);
      showToast('Employee updated successfully');
    } catch (error) {
      console.error('Error saving item:', error);
      showToast(error.message || 'Failed to save changes', 'error');
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
    setShowEmployeeModal(false);
  };

  const handleDeleteTag = (tag) => {
    if (!tag?.id) return;

    setItemToDelete({
      type: 'tag',
      item: tag,
    });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete?.type !== 'tag' || !itemToDelete.item?.id) {
      setShowDeleteModal(false);
      setItemToDelete(null);
      return;
    }

    const tag = itemToDelete.item;

    if (!tag?.id) return;

    try {
      const response = await fetchWithAuth(`http://localhost:8000/api/tags/${tag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to delete tag');
      }

      setTags((prev) => prev.filter((item) => item.id !== tag.id));
      if (editingItem === tag.id) {
        setEditingItem(null);
        setEditForm({});
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
      showToast('Tag deleted successfully');
    } catch (error) {
      console.error('Error deleting tag:', error);
      showToast(error.message || 'Failed to delete tag', 'error');
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // ---------- Create Handlers ----------
  const handleCreateClick = () => {
    if (activeTab === 'employees') {
      setCreateForm({
        name: '',
        email: '',
        workgroup_code: '',
        role_id: 3,
        active: true,
        password: '',
        joined_date: new Date().toISOString().split('T')[0]
      });
      setShowCreateModal(true);
      return;
    } else if (activeTab === 'tags') {
      setCreateForm({ label: '', color: '#666666', project_id: '' });
    } else if (activeTab === 'workgroups' || activeTab === 'modules') {
      setCreateForm({ name: '', description: '' });
    } else if (activeTab === 'projects') {
      setProjectToEdit(null);
      setShowProjectModal(true);
      return;
    } else if (activeTab === 'workflows') {
      setWorkflowToEdit(null);
      setShowCreateWorkflowModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateSave = async () => {
    let newItem = { ...createForm };

    if (activeTab === 'tags') {
      if (!newItem.project_id) {
        setAlertMessage('Select a project for this tag before creating it.');
        setShowAlertModal(true);
        return;
      }

      const isDuplicate = tags.some(tag => tag.label.toLowerCase() === newItem.label.toLowerCase());
      if (isDuplicate) {
        setAlertMessage('A tag with this label already exists.');
        setShowAlertModal(true);
        return;
      }
    }

    if (activeTab === 'employees') {
      if (!newItem.password || newItem.password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }
    }

    try {
      const response = await fetch(`http://localhost:8000/api/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Failed to create ${activeTab.slice(0, -1) || 'item'}`);
      }

      const createdItem = await response.json();

      if (activeTab === 'employees') setEmployees(prev => [...prev, createdItem]);
      else if (activeTab === 'tags') setTags(prev => [...prev, createdItem]);
      else if (activeTab === 'workgroups') setWorkgroups(prev => [...prev, createdItem]);
      else if (activeTab === 'modules') setModules(prev => [...prev, createdItem]);

      setShowCreateModal(false);
      setCreateForm({});
      showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)} created successfully`);
    } catch (error) {
      console.error('Error creating item:', error);
      showToast(error.message || 'Failed to create item', 'error');
    }
  };

  const handleCreateCancel = () => {
    setShowCreateModal(false);
    setCreateForm({});
  };

  // ---------- Tabs ----------
  const tabs = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'workgroups', label: 'Workgroups', icon: Briefcase },
    { id: 'modules', label: 'Modules', icon: AppWindow },
    { id: 'workflows', label: 'Workflows', icon: GitCommit },
    { id: 'projects', label: 'Projects', icon: FolderOpen }
  ];

  const handleProjectEdit = (project) => {
    setProjectToEdit(project);
    setShowProjectModal(true);
    setIsProjectDetailLoading(true);

    fetchWithAuth(`http://localhost:8000/api/projects/${project.id}`)
      .then(async (response) => {
        const data = await parseApiResponse(response, 'Failed to load project details');
        setProjectToEdit(normalizeProject(data));
      })
      .catch((error) => {
        console.error('Error loading project details:', error);
        showToast(error.message || 'Failed to load project details', 'error');
        setShowProjectModal(false);
        setProjectToEdit(null);
      })
      .finally(() => {
        setIsProjectDetailLoading(false);
      });
  };

  const handleProjectModalClose = () => {
    setShowProjectModal(false);
    setProjectToEdit(null);
    setIsProjectDetailLoading(false);
  };

  const saveProject = async (projectForm) => {
    setIsProjectSaving(true);

    try {
      const isEditing = Boolean(projectForm.id);

      if (isEditing) {
        await parseApiResponse(
          await fetchWithAuth(`http://localhost:8000/api/projects/${projectForm.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: projectForm.name,
              description: projectForm.description,
              active: projectForm.active,
            }),
          }),
          'Failed to update project details'
        );

        await parseApiResponse(
          await fetchWithAuth(`http://localhost:8000/api/projects/${projectForm.id}/workgroups`, {
            method: 'PUT',
            body: JSON.stringify({
              workgroupCodes: projectForm.workgroupCodes,
            }),
          }),
          'Failed to update project workgroups'
        );

        await parseApiResponse(
          await fetchWithAuth(`http://localhost:8000/api/projects/${projectForm.id}/workflows`, {
            method: 'PUT',
            body: JSON.stringify({
              workflowIds: projectForm.workflowIds,
            }),
          }),
          'Failed to update project workflows'
        );
      } else {
        await parseApiResponse(
          await fetchWithAuth('http://localhost:8000/api/projects', {
            method: 'POST',
            body: JSON.stringify(projectForm),
          }),
          'Failed to create project'
        );
      }

      await refreshProjects();

      if (isEditing) {
        const refreshedProjectResponse = await fetchWithAuth(`http://localhost:8000/api/projects/${projectForm.id}`);
        const refreshedProject = await parseApiResponse(
          refreshedProjectResponse,
          'Project updated, but the refreshed project record could not be loaded.'
        );

        const savedWorkgroupCodes = (refreshedProject.workgroups || []).map((workgroup) => workgroup.code);
        const savedWorkflowIds = (refreshedProject.workflows || []).map((workflow) => workflow.id);

        if (
          !sameMembers(savedWorkgroupCodes, projectForm.workgroupCodes) ||
          !sameMembers(savedWorkflowIds, projectForm.workflowIds)
        ) {
          throw new Error(
            'Project details were saved, but the refreshed assignments do not match the selected workflows/workgroups.'
          );
        }
      }

      setShowProjectModal(false);
      setProjectToEdit(null);
      showToast(isEditing ? 'Project updated successfully' : 'Project created successfully');
    } catch (error) {
      console.error('Error saving project:', error);
      showToast(error.message || 'Failed to save project', 'error');
    } finally {
      setIsProjectSaving(false);
    }
  };

  const handleProjectToggleActive = (project) => {
    setProjectToggleTarget(project);
  };

  const confirmProjectToggleActive = async () => {
    const project = projectToggleTarget;
    if (!project) return;

    try {
      const response = await fetchWithAuth(`http://localhost:8000/api/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: project.name,
          description: project.description || '',
          active: !isTruthyProjectActive(project.active),
        }),
      });
      await parseApiResponse(response, 'Failed to update project status');

      await refreshProjects();
      setProjectToggleTarget(null);
      showToast(
        isTruthyProjectActive(project.active)
          ? 'Project deactivated successfully'
          : 'Project activated successfully'
      );
    } catch (error) {
      console.error('Error updating project status:', error);
      showToast(error.message || 'Failed to update project status', 'error');
    }
  };

  const renderCurrentTabComponent = () => {
    if (loading) {
      switch (activeTab) {
        case 'employees':
          return <EmployeesTabSkeleton />;
        case 'tags':
          return <TagsTabSkeleton />;
        case 'workgroups':
          return <WorkgroupsTabSkeleton />;
        case 'modules':
          return <ModulesTabSkeleton />;
        case 'workflows':
          return <WorkflowsTabSkeleton />;
        case 'projects':
          return <ProjectsTabSkeleton />;
        default:
          return null;
      }
    }

    switch (activeTab) {
      case 'employees':
        return (
          <EmployeesTab
            employees={employees}
            workgroups={workgroups}
            roles={roles}
            handleEdit={handleEdit}
          />
        );
      case 'tags':
        return (
          <TagsTab
            tags={tags}
            projects={projects}
            editingItem={editingItem}
            editForm={editForm}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleInputChange={handleInputChange}
            handleDelete={handleDeleteTag}
          />
        );
      case 'workgroups':
        return (
          <WorkgroupsTab
            workgroups={workgroups}
            editingItem={editingItem}
            editForm={editForm}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleInputChange={handleInputChange}
          />
        );
      case 'modules':
        return (
          <ModulesTab
            modules={modules}
            editingItem={editingItem}
            editForm={editForm}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleInputChange={handleInputChange}
          />
        );
      case 'workflows':
        return (
          <WorkflowsTab
            workflows={workflows}
            workgroups={workgroups}
            onEdit={setWorkflowToEdit}
            onCreateClick={() => setShowCreateWorkflowModal(true)}
          />
        );
      case 'projects':
        return (
          <ProjectsTab
            projects={projects}
            onEdit={handleProjectEdit}
            onToggleActive={handleProjectToggleActive}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-[70] px-4 py-2 rounded-md text-sm shadow-lg ${
              toast.type === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-green-100 text-green-800 border border-green-200'
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="mt-1">Manage employees, tags, workgroups, modules, workflows, and projects</p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
            <button
              onClick={handleCreateClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add New</span>
            </button>
          </div>
          {renderCurrentTabComponent()}
        </div>

        {/* Create / Workflow / Delete / Alert modals */}
        {showCreateModal && activeTab === 'employees' && (
          <EmployeeModal
            isOpen={showCreateModal}
            formData={createForm}
            workgroups={workgroups}
            roles={roles}
            onClose={handleCreateCancel}
            onSave={handleCreateSave}
            onInputChange={(f, v) => setCreateForm(prev => ({ ...prev, [f]: v }))}
            mode="create"
          />
        )}
        {showCreateModal && activeTab !== 'employees' && (
          <CreateModal
            activeTab={activeTab}
            createForm={createForm}
            handleCreateInputChange={(f, v) => setCreateForm(prev => ({ ...prev, [f]: v }))}
            handleCreateSave={handleCreateSave}
            handleCreateCancel={handleCreateCancel}
            workgroups={workgroups}
            roles={roles}
            projects={projects}
          />
        )}
        {showEmployeeModal && (
          <EmployeeModal
            isOpen={showEmployeeModal}
            formData={editForm}
            workgroups={workgroups}
            roles={roles}
            onClose={handleCancel}
            onSave={handleSave}
            onInputChange={handleInputChange}
            mode="edit"
          />
        )}
        {showCreateWorkflowModal && (
          <CreateWorkflowModal
            workflowToEdit={workflowToEdit}
            onClose={() => setShowCreateWorkflowModal(false)}
            onSave={saveWorkflow}
            workgroups={workgroups}
          />
        )}
        {showProjectModal && (
          isProjectDetailLoading ? (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Loading Project
                  </h3>
                  <button
                    onClick={handleProjectModalClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Fetching project workgroups and workflows...
                </p>
              </div>
            </div>
          ) : (
            <ProjectModal
              isOpen={showProjectModal}
              project={projectToEdit}
              workgroups={workgroups}
              workflows={workflows}
              isSaving={isProjectSaving}
              onClose={handleProjectModalClose}
              onSave={saveProject}
            />
          )
        )}
        {showDeleteModal && (
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}
            onConfirm={confirmDelete}
            title="Delete Tag"
            message={
              itemToDelete?.type === 'tag' && itemToDelete.item
                ? `Are you sure you want to delete the tag "${itemToDelete.item.label}"? This action cannot be undone.`
                : 'Are you sure you want to delete this item? This action cannot be undone.'
            }
            confirmLabel="Delete"
            confirmVariant="danger"
          />
        )}
        <ConfirmationModal
          isOpen={!!projectToggleTarget}
          onClose={() => setProjectToggleTarget(null)}
          onConfirm={confirmProjectToggleActive}
          title={projectToggleTarget?.active ? 'Deactivate Project' : 'Activate Project'}
          message={
            projectToggleTarget
              ? `Are you sure you want to ${projectToggleTarget.active ? 'deactivate' : 'activate'} "${projectToggleTarget.name}"?`
              : ''
          }
          confirmLabel={projectToggleTarget?.active ? 'Deactivate' : 'Activate'}
          confirmVariant={projectToggleTarget?.active ? 'danger' : 'primary'}
        />
        {showAlertModal && (
          <AlertModal
            isOpen={showAlertModal}
            onClose={() => setShowAlertModal(false)}
            title={alertMessage === 'A tag with this label already exists.' ? 'Duplicate Tag' : 'Tag Validation'}
            message={alertMessage}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
