import React, { useState, useEffect } from 'react';
import { Plus, Users, Tag, Briefcase, AppWindow, GitCommit } from 'lucide-react';
import EmployeesTab from '../components/AdminPanel/EmployeesTab';
import TagsTab from '../components/AdminPanel/TagsTab';
import WorkgroupsTab from '../components/AdminPanel/WorkgroupsTab';
import ModulesTab from '../components/AdminPanel/ModulesTab';
import WorkflowsTab from '../components/AdminPanel/WorkflowsTab';
import CreateModal from '../components/AdminPanel/CreateModal';
import CreateWorkflowModal from '../components/AdminPanel/CreateWorkflowModal';
import ConfirmationModal from '../components/AdminPanel/ConfirmationModal';
import AlertModal from '../components/AdminPanel/AlertModal';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [tags, setTags] = useState([]);
  const [modules, setModules] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState(null);
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
      const [empRes, tagsRes, wgRes, modRes, wfRes, rolesRes] = await Promise.all([
        fetch('http://localhost:8000/api/employees'),
        fetch('http://localhost:8000/api/tags'),
        fetch('http://localhost:8000/api/workgroups'),
        fetch('http://localhost:8000/api/modules'),
        fetch('http://localhost:8000/api/workflow_management'),
        fetch('http://localhost:8000/api/employees/roles')
      ]);

      setEmployees(await empRes.json());
      setTags(await tagsRes.json());
      setWorkgroups(await wgRes.json());
      setModules(await modRes.json());
      setWorkflows(await wfRes.json());
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
      const wfRes = await fetch('http://localhost:8000/api/workflow_management');
      const data = await wfRes.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error refreshing workflows:', error);
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
      const payload = {
        name: editForm.name,
        email: editForm.email,
        workgroupId: editForm.workgroup_code || null,
        roleId: editForm.role_id || 3,
        active: editForm.active ? 1 : 0,
        ...(editForm.password ? { password: editForm.password } : {})
      };

      const response = await fetch(`http://localhost:8000/api/employees/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to update employee');

      // Fetch updated employee from backend to get roleName/workgroupName
      const updatedEmployeeRes = await fetch(`http://localhost:8000/api/employees/${editForm.id}`);
      const updatedEmployee = await updatedEmployeeRes.json();

      setEmployees(prev =>
        prev.map(emp => (emp.id === editForm.id ? updatedEmployee : emp))
      );

      setEditingItem(null);
      setEditForm({});
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
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
        active: 1,
        joined_date: new Date().toISOString().split('T')[0]
      });
    } else if (activeTab === 'tags') {
      setCreateForm({ label: '' });
    } else if (activeTab === 'workgroups' || activeTab === 'modules') {
      setCreateForm({ name: '', description: '' });
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
      const isDuplicate = tags.some(tag => tag.label.toLowerCase() === newItem.label.toLowerCase());
      if (isDuplicate) {
        setAlertMessage('A tag with this label already exists.');
        setShowAlertModal(true);
        return;
      }
    }

    try {
      const response = await fetch(`http://localhost:8000/api/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      const createdItem = await response.json();

      if (activeTab === 'employees') setEmployees(prev => [...prev, createdItem]);
      else if (activeTab === 'tags') setTags(prev => [...prev, createdItem]);
      else if (activeTab === 'workgroups') setWorkgroups(prev => [...prev, createdItem]);
      else if (activeTab === 'modules') setModules(prev => [...prev, createdItem]);

      setShowCreateModal(false);
      setCreateForm({});
    } catch (error) {
      console.error('Error creating item:', error);
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
    { id: 'workflows', label: 'Workflows', icon: GitCommit }
  ];

  const renderCurrentTabComponent = () => {
    if (loading) return <div className="text-center py-8">Loading...</div>;

    switch (activeTab) {
      case 'employees':
        return (
          <EmployeesTab
            employees={employees}
            workgroups={workgroups}
            roles={roles}
            editingItem={editingItem}
            editForm={editForm}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleInputChange={handleInputChange}
          />
        );
      case 'tags':
        return (
          <TagsTab
            tags={tags}
            editingItem={editingItem}
            editForm={editForm}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleInputChange={handleInputChange}
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
          <p className="mt-1">Manage employees, tags, workgroups, modules, and workflows</p>
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
        {showCreateModal && (
          <CreateModal
            activeTab={activeTab}
            createForm={createForm}
            handleCreateInputChange={(f, v) => setCreateForm(prev => ({ ...prev, [f]: v }))}
            handleCreateSave={handleCreateSave}
            handleCreateCancel={handleCreateCancel}
            workgroups={workgroups}
            roles={roles}
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
        {showDeleteModal && (
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => setEmployees(prev => prev.filter(emp => emp.id !== itemToDelete))}
            title="Confirm Deletion"
            message="Are you sure you want to delete this item? This action cannot be undone."
          />
        )}
        {showAlertModal && (
          <AlertModal
            isOpen={showAlertModal}
            onClose={() => setShowAlertModal(false)}
            title="Duplicate Tag"
            message={alertMessage}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
