import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';

const evaluateStrength = (password) => {
  if (!password || password.length < 6) return 'Weak';

  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  if (password.length >= 10 && hasLetters && hasNumbers && hasSymbols) {
    return 'Strong';
  }

  if (hasLetters && hasNumbers) {
    return 'Medium';
  }

  return 'Weak';
};

const strengthColor = {
  Weak: 'bg-red-500',
  Medium: 'bg-yellow-500',
  Strong: 'bg-green-600',
};

const EmployeeModal = ({
  isOpen,
  formData,
  workgroups,
  roles,
  onClose,
  onSave,
  onInputChange,
  mode = 'edit',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setShowPassword(false);
      setPasswordStrength('');
      return;
    }

    setPasswordStrength(formData.password ? evaluateStrength(formData.password) : '');
  }, [isOpen, formData.password]);

  if (!isOpen) return null;

  const handlePasswordChange = (value) => {
    onInputChange('password', value);
    setPasswordStrength(value ? evaluateStrength(value) : '');
  };

  const isCreateMode = mode === 'create';
  const title = isCreateMode ? 'Add New Employee' : 'Edit Employee';
  const subtitle = isCreateMode
    ? 'Create an employee account with access, status, and password settings.'
    : 'Update account details, access, and password in one place.';
  const passwordLabel = isCreateMode ? 'Set Password' : 'Change Password';
  const passwordHint = isCreateMode
    ? 'A password is required to create the employee account.'
    : 'Leave blank to keep the current password.';
  const saveLabel = isCreateMode ? 'Create Employee' : 'Save Changes';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close employee modal"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => onInputChange('name', e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => onInputChange('email', e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Workgroup
                </label>
                <select
                  value={formData.workgroup_code || ''}
                  onChange={(e) => onInputChange('workgroup_code', e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Workgroup</option>
                  {workgroups.map((workgroup) => (
                    <option key={workgroup.id} value={workgroup.id}>
                      {workgroup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Role
                </label>
                <select
                  value={formData.role_id || 3}
                  onChange={(e) => onInputChange('role_id', Number.parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-gray-300 p-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Account Status
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    formData.active
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                      : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="employee-status"
                      checked={!!formData.active}
                      onChange={() => onInputChange('active', true)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Active</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        User can sign in and participate normally.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    !formData.active
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                      : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="employee-status"
                      checked={!formData.active}
                      onChange={() => onInputChange('active', false)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Inactive</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        User keeps history but should no longer access the app.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <Lock className="h-4 w-4 text-blue-500" />
                {passwordLabel}
              </label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {passwordHint}
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={isCreateMode ? 'Enter a password' : 'Enter a new password'}
                  className="w-full rounded-md border border-gray-300 p-2 pr-10 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-gray-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {formData.password?.length > 0 && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
                    <div
                      className={`h-full transition-all ${strengthColor[passwordStrength]}`}
                      style={{
                        width:
                          passwordStrength === 'Weak'
                            ? '33%'
                            : passwordStrength === 'Medium'
                              ? '66%'
                              : '100%',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Strength: <span className="font-semibold">{passwordStrength}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeModal;
