import React, { useState, useEffect } from 'react';
import { Plus, Users, Tag, Briefcase, AppWindow, GitCommit } from 'lucide-react';
import EmployeesTab from '../components/EmployeesTab';
import TagsTab from '../components/TagsTab';
import WorkgroupsTab from '../components/WorkgroupsTab';
import ModulesTab from '../components/ModulesTab';
import WorkflowsTab from '../components/WorkflowsTab';
import CreateModal from '../components/CreateModal';
import CreateWorkflowModal from '../components/CreateWorkflowModal';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [tags, setTags] = useState([]);
  const [modules, setModules] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [workflows, setWorkflows] = useState([]); // New state for workflows
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false); // New state for workflow modal
  const [workflowToEdit, setWorkflowToEdit] = useState(null); // New state for editing workflows

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, tagsRes, wgRes, modRes, wfRes] = await Promise.all([
        fetch('http://localhost:8000/employees'),
        fetch('http://localhost:8000/tags'),
        fetch('http://localhost:8000/workgroups'),
        fetch('http://localhost:8000/modules'),
        fetch('http://localhost:8000/workflows') // Fetch workflows
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

  const handleCreateClick = () => {
    let newItem = {};

    if (activeTab === 'employees') {
      newItem = {
        name: '',
        email: '',
        workgroup: '',
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
        setWorkflowToEdit(null); // Clear any previous edit state
        setShowCreateWorkflowModal(true);
    }
  };

  const handleCreateSave = async () => {
    let newItem = { ...createForm };

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
        // Create new workflow
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
        // Edit existing workflow
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
    { id: 'workflows', label: 'Workflows', icon: GitCommit }, // New tab
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
      </div>
    </div>
  );
};

export default AdminPanel;