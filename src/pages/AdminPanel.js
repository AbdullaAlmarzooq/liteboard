import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Users, Tag, Briefcase } from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [tags, setTags] = useState([]);
  const [workgroups, setWorkgroups] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, tagsRes, wgRes] = await Promise.all([
        fetch('http://localhost:8000/employees'),
        fetch('http://localhost:8000/tags'),
        fetch('http://localhost:8000/workgroups')
      ]);
      
      setEmployees(await empRes.json());
      setTags(await tagsRes.json());
      setWorkgroups(await wgRes.json());
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
      
      // Update local state
      if (activeTab === 'employees') {
        setEmployees(prev => prev.map(emp => emp.id === editForm.id ? editForm : emp));
      } else if (activeTab === 'tags') {
        setTags(prev => prev.map(tag => tag.id === editForm.id ? editForm : tag));
      } else if (activeTab === 'workgroups') {
        setWorkgroups(prev => prev.map(wg => wg.id === editForm.id ? editForm : wg));
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({});

  const handleCreateClick = () => {
    let newItem = {};
    
    if (activeTab === 'employees') {
      newItem = {
        name: '',
        email: '',
        position: '',
        department: '',
        workgroup: '',
        skills: [],
        active: true,
        joined_date: new Date().toISOString().split('T')[0]
      };
    } else if (activeTab === 'tags') {
      newItem = {
        label: ''
      };
    } else if (activeTab === 'workgroups') {
      newItem = {
        name: '',
        description: ''
      };
    }

    setCreateForm(newItem);
    setShowCreateModal(true);
  };

  const handleCreateSave = async () => {
    let newItem = { ...createForm };
    
    // Generate ID
    if (activeTab === 'employees') {
      newItem.id = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    } else if (activeTab === 'tags') {
      newItem.id = `TAG-${String(tags.length + 1).padStart(3, '0')}`;
    } else if (activeTab === 'workgroups') {
      newItem.id = `WG-${String(workgroups.length + 1).padStart(3, '0')}`;
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

  const tabs = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'workgroups', label: 'Workgroups', icon: Briefcase }
  ];

  const renderEmployeeItem = (employee) => (
    <div key={employee.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">{employee.id}</span>
          {employee.active && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>}
        </div>
        <div className="flex space-x-2">
          {editingItem === employee.id ? (
            <>
              <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                <Save size={16} />
              </button>
              <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                <X size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => handleEdit(employee)} className="text-blue-600 hover:text-blue-800">
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {editingItem === employee.id ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editForm.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Name"
          />
          <input
            type="email"
            value={editForm.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Email"
          />
          <input
            type="text"
            value={editForm.position || ''}
            onChange={(e) => handleInputChange('position', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Position"
          />
          <input
            type="text"
            value={editForm.department || ''}
            onChange={(e) => handleInputChange('department', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Department"
          />
          <input
            type="text"
            value={editForm.workgroup || ''}
            onChange={(e) => handleInputChange('workgroup', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Workgroup"
          />
          <input
            type="text"
            value={editForm.skills ? editForm.skills.join(', ') : ''}
            onChange={(e) => handleSkillsChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Skills (comma separated)"
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={editForm.active || false}
              onChange={(e) => handleInputChange('active', e.target.checked)}
              className="rounded"
            />
            <label className="text-sm text-gray-700">Active</label>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{employee.name}</h3>
          <p className="text-gray-600">{employee.email}</p>
          <p className="text-sm text-gray-500">{employee.position}</p>
          <p className="text-sm text-gray-500">{employee.department} - {employee.workgroup}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {employee.skills.map((skill, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {skill}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400">Joined: {employee.joined_date}</p>
        </div>
      )}
    </div>
  );

  const renderTagItem = (tag) => (
    <div key={tag.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">{tag.id}</span>
        </div>
        <div className="flex space-x-2">
          {editingItem === tag.id ? (
            <>
              <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                <Save size={16} />
              </button>
              <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                <X size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => handleEdit(tag)} className="text-blue-600 hover:text-blue-800">
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {editingItem === tag.id ? (
        <div className="mt-3">
          <input
            type="text"
            value={editForm.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Tag label"
          />
        </div>
      ) : (
        <div className="mt-2">
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
            {tag.label}
          </span>
        </div>
      )}
    </div>
  );

  const renderWorkgroupItem = (workgroup) => (
    <div key={workgroup.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500">{workgroup.id}</span>
        </div>
        <div className="flex space-x-2">
          {editingItem === workgroup.id ? (
            <>
              <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                <Save size={16} />
              </button>
              <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                <X size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => handleEdit(workgroup)} className="text-blue-600 hover:text-blue-800">
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {editingItem === workgroup.id ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editForm.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Workgroup name"
          />
          <textarea
            value={editForm.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Description"
            rows="3"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{workgroup.name}</h3>
          <p className="text-gray-600 text-sm">{workgroup.description}</p>
        </div>
      )}
    </div>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'employees': return employees;
      case 'tags': return tags;
      case 'workgroups': return workgroups;
      default: return [];
    }
  };

  const renderCurrentItems = () => {
    const data = getCurrentData();
    
    if (loading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No items found</div>;
    }

    return (
      <div className="grid gap-4">
        {activeTab === 'employees' && data.map(renderEmployeeItem)}
        {activeTab === 'tags' && data.map(renderTagItem)}
        {activeTab === 'workgroups' && data.map(renderWorkgroupItem)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600 mt-1">Manage employees, tags, and workgroups</p>
          </div>

          {/* Tabs */}
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

          {/* Content */}
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

            {renderCurrentItems()}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Add New {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
                  </h3>
                  <button
                    onClick={handleCreateCancel}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  {activeTab === 'employees' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={createForm.name || ''}
                          onChange={(e) => handleCreateInputChange('name', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={createForm.email || ''}
                          onChange={(e) => handleCreateInputChange('email', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <input
                          type="text"
                          value={createForm.position || ''}
                          onChange={(e) => handleCreateInputChange('position', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter position"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          value={createForm.department || ''}
                          onChange={(e) => handleCreateInputChange('department', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter department"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Workgroup</label>
                        <select
                          value={createForm.workgroup || ''}
                          onChange={(e) => handleCreateInputChange('workgroup', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Workgroup</option>
                          {workgroups && workgroups.map(wg => (
                            <option key={wg.id} value={wg.name}>{wg.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                        <input
                          type="text"
                          value={createForm.skills ? createForm.skills.join(', ') : ''}
                          onChange={(e) => handleCreateSkillsChange(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter skills (comma separated)"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={createForm.active || false}
                          onChange={(e) => handleCreateInputChange('active', e.target.checked)}
                          className="rounded"
                        />
                        <label className="text-sm text-gray-700">Active</label>
                      </div>
                    </>
                  )}

                  {activeTab === 'tags' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={createForm.label || ''}
                        onChange={(e) => handleCreateInputChange('label', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter tag label"
                      />
                    </div>
                  )}

                  {activeTab === 'workgroups' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={createForm.name || ''}
                          onChange={(e) => handleCreateInputChange('name', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter workgroup name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={createForm.description || ''}
                          onChange={(e) => handleCreateInputChange('description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter description"
                          rows="3"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleCreateCancel}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;