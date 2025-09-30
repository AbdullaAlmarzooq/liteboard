import React, { useState, useEffect } from 'react';
import { Plus, Users, Tag, Briefcase, AppWindow, GitCommit, Trash2 } from 'lucide-react';
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
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // New states for the alert modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, tagsRes, wgRes, modRes, wfRes] = await Promise.all([
        fetch('http://localhost:8000/api/employees'),
        fetch('http://localhost:8000/api/tags'),
        fetch('http://localhost:8000/api/workgroups'),
        fetch('http://localhost:8000/api/modules'),
        fetch('http://localhost:8000/api/workflows')
      ]);

      setEmployees(await empRes.json());
      setTags(await tagsRes.json());
      setWorkgroups(await wgRes.json());
      setModules(await modRes.json());
      setWorkflows(await wfRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditForm(item);
  };

  const handleSave = async () => {
    const endpoint = `http://localhost:8000/${activeTab}/${editForm.id}`;
    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (activeTab === 'employees') {
        setEmployees(prev => prev.map(emp => emp.id === editForm.id ? editForm : emp));
      } else if (activeTab === 'tags') {
        setTags(prev => prev.map(tag => tag.id === editForm.id ? editForm : tag));
      } else if (activeTab === 'workgroups') {
        setWorkgroups(prev => prev.map(wg => wg.id === editForm.id ? editForm : wg));
      } else if (activeTab === 'modules') {
        setModules(prev => prev.map(mod => mod.id === editForm.id ? editForm : mod));
      }

      setEditingItem(null);
      setEditForm({});
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    const endpoint = `http://localhost:8000/${activeTab}/${itemToDelete}`;
    try {
      await fetch(endpoint, {
        method: 'DELETE'
      });

      if (activeTab === 'tags') {
        setTags(prev => prev.filter(item => item.id !== itemToDelete));
      } else if (activeTab === 'employees') {
        setEmployees(prev => prev.filter(item => item.id !== itemToDelete));
      } else if (activeTab === 'workgroups') {
        setWorkgroups(prev => prev.filter(item => item.id !== itemToDelete));
      } else if (activeTab === 'modules') {
        setModules(prev => prev.filter(item => item.id !== itemToDelete));
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleCreateClick = () => {
    let newItem = {};

    if (activeTab === 'employees') {
      newItem = {
        name: '',
        email: '',
        workgroupCode: '',
        active: true,
        joined_date: new Date().toISOString().split('T')[0]
      };
      setCreateForm(newItem);
      setShowCreateModal(true);
    } else if (activeTab === 'tags') {
      newItem = {
        label: ''
      };
      setCreateForm(newItem);
      setShowCreateModal(true);
    } else if (activeTab === 'workgroups') {
      newItem = {
        name: '',
        description: ''
      };
      setCreateForm(newItem);
      setShowCreateModal(true);
    } else if (activeTab === 'modules') {
      newItem = {
        name: '',
        description: ''
      };
      setCreateForm(newItem);
      setShowCreateModal(true);
    } else if (activeTab === 'workflows') {
      setWorkflowToEdit(null);
      setShowCreateWorkflowModal(true);
    }
  };

  const handleCreateSave = async () => {
    let newItem = { ...createForm };

    // Prevent duplicate tag creation and show modal instead of alert
    if (activeTab === 'tags') {
        const isDuplicate = tags.some(tag => tag.label.toLowerCase() === newItem.label.toLowerCase());
        if (isDuplicate) {
            setAlertMessage('A tag with this label already exists.');
            setShowAlertModal(true);
            return;
        }
    }

    if (activeTab === 'employees') {
      newItem.id = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    } else if (activeTab === 'tags') {
      newItem.id = `TAG-${String(tags.length + 1).padStart(3, '0')}`;
    } else if (activeTab === 'workgroups') {
      newItem.id = `WG-${String(workgroups.length + 1).padStart(3, '0')}`;
    } else if (activeTab === 'modules') {
      newItem.id = `MOD-${String(modules.length + 1).padStart(3, '0')}`;
    }

    try {
      const response = await fetch(`http://localhost:8000/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      const createdItem = await response.json();

      if (activeTab === 'employees') {
        setEmployees(prev => [...prev, createdItem]);
      } else if (activeTab === 'tags') {
        setTags(prev => [...prev, createdItem]);
      } else if (activeTab === 'workgroups') {
        setWorkgroups(prev => [...prev, createdItem]);
      } else if (activeTab === 'modules') {
        setModules(prev => [...prev, createdItem]);
      }

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

  const handleCreateInputChange = (field, value) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateSkillsChange = (skills) => {
    const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill);
    setCreateForm(prev => ({
      ...prev,
      skills: skillsArray
    }));
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSkillsChange = (skills) => {
    const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill);
    setEditForm(prev => ({
      ...prev,
      skills: skillsArray
    }));
  };

  const handleWorkflowSave = async (workflow) => {
    try {
      if (!workflow.id) {
        const newId = `WF-${String(workflows.length + 1).padStart(3, '0')}`;
        const newWorkflow = { ...workflow, id: newId };
        const response = await fetch('http://localhost:8000/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWorkflow)
        });
        const createdWorkflow = await response.json();
        setWorkflows(prev => [...prev, createdWorkflow]);
      } else {
        await fetch(`http://localhost:8000/workflows/${workflow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow)
        });
        setWorkflows(prev => prev.map(wf => wf.id === workflow.id ? workflow : wf));
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const handleWorkflowDelete = async (id) => {
    try {
      await fetch(`http://localhost:8000/workflows/${id}`, {
        method: 'DELETE'
      });
      setWorkflows(prev => prev.filter(wf => wf.id !== id));
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const handleWorkflowEditClick = (workflow) => {
    setWorkflowToEdit(workflow);
    setShowCreateWorkflowModal(true);
  };

  const tabs = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'workgroups', label: 'Workgroups', icon: Briefcase },
    { id: 'modules', label: 'Modules', icon: AppWindow },
    { id: 'workflows', label: 'Workflows', icon: GitCommit },
  ];

  const renderCurrentTabComponent = () => {
    if (loading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    switch (activeTab) {
      case 'employees':
        return (
          <EmployeesTab
            employees={employees}
            workgroups={workgroups}
            editingItem={editingItem}
            editForm={editForm}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleInputChange={handleInputChange}
            handleSkillsChange={handleSkillsChange}
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
            handleDelete={handleDelete}
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
            onEdit={handleWorkflowEditClick}
            onDelete={handleWorkflowDelete}
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
        <div>
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
        </div>

        {showCreateModal && (
          <CreateModal
            activeTab={activeTab}
            createForm={createForm}
            handleCreateInputChange={handleCreateInputChange}
            handleCreateSkillsChange={handleCreateSkillsChange}
            handleCreateSave={handleCreateSave}
            handleCreateCancel={handleCreateCancel}
            workgroups={workgroups}
          />
        )}

        {showCreateWorkflowModal && (
          <CreateWorkflowModal
            workflowToEdit={workflowToEdit}
            onClose={() => setShowCreateWorkflowModal(false)}
            onSave={handleWorkflowSave}
            workgroups={workgroups}
          />
        )}

        {showDeleteModal && (
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
            title="Confirm Deletion"
            message="Are you sure you want to delete this item? This action cannot be undone."
          />
        )}

        {/* Render the new alert modal for duplicate tags */}
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