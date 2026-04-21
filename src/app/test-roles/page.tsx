'use client'

import { useState, useEffect } from 'react'
import { 
  ROLE_DISPLAY_NAMES, 
  ROLE_DESCRIPTIONS, 
  ROLE_HIERARCHY,
  hasHigherOrEqualRole,
  canAssignRole,
  getRoleDisplayName,
  getRoleDescription,
  getAssignableRoles,
  isFinancialRole,
  isManagementRole,
  hasAuditCapabilities
} from '@/lib/permissions'
import { 
  ShieldCheckIcon, 
  UserGroupIcon, 
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function RoleSystemTestPage() {
  const [currentRole, setCurrentRole] = useState('EMPLOYEE')
  const [targetRole, setTargetRole] = useState('DEPARTMENT_MANAGER')
  const [testResults, setTestResults] = useState<any>({})

  const allRoles = [
    'ADMINISTRATOR',
    'HR_MANAGER', 
    'DEPARTMENT_MANAGER',
    'EMPLOYEE',
    'PAYROLL_OFFICER',
    'SYSTEM_AUDITOR',
    // Legacy roles
    'SUPER_ADMIN',
    'HR_ADMIN',
    'MANAGER'
  ]

  useEffect(() => {
    runRoleTests()
  }, [currentRole, targetRole])

  const runRoleTests = () => {
    const results = {
      roleDisplay: getRoleDisplayName(currentRole),
      roleDescription: getRoleDescription(currentRole),
      roleHierarchy: ROLE_HIERARCHY[currentRole] || 0,
      assignableRoles: getAssignableRoles(currentRole),
      canAssignTarget: canAssignRole(currentRole, targetRole),
      hasHigherThanTarget: hasHigherOrEqualRole(currentRole, targetRole),
      isFinancial: isFinancialRole(currentRole),
      isManagement: isManagementRole(currentRole),
      hasAudit: hasAuditCapabilities(currentRole),
      permissionTests: {
        canViewAllEmployees: ['ADMINISTRATOR', 'HR_MANAGER', 'PAYROLL_OFFICER', 'SYSTEM_AUDITOR'].includes(currentRole),
        canManageUsers: ['ADMINISTRATOR'].includes(currentRole),
        canApproveLeave: ['ADMINISTRATOR', 'HR_MANAGER', 'DEPARTMENT_MANAGER'].includes(currentRole),
        canProcessPayroll: ['ADMINISTRATOR', 'PAYROLL_OFFICER'].includes(currentRole),
        canAuditSystem: ['ADMINISTRATOR', 'SYSTEM_AUDITOR'].includes(currentRole)
      }
    }
    setTestResults(results)
  }

  const renderTestResult = (test: boolean, label: string) => (
    <div className="flex items-center space-x-2">
      {test ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : (
        <XCircleIcon className="h-5 w-5 text-red-500" />
      )}
      <span className={`text-sm ${test ? 'text-green-700' : 'text-red-700'}`}>
        {label}
      </span>
    </div>
  )

  const getBadgeColor = (role: string) => {
    const level = ROLE_HIERARCHY[role] || 0
    if (level >= 6) return 'bg-purple-100 text-purple-800 border-purple-200'
    if (level >= 4) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (level >= 2) return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <ShieldCheckIcon className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Role Management System Test
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive testing interface for the 6-role hierarchy system with advanced permissions and access control
          </p>
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <CogIcon className="h-6 w-6 mr-2" />
            Test Configuration
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current User Role
              </label>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                className="w-full input"
              >
                {allRoles.map(role => (
                  <option key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Role (for assignment tests)
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full input"
              >
                {allRoles.map(role => (
                  <option key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Role Information */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Role Information
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Display Name</label>
                <div className={`mt-1 inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor(currentRole)}`}>
                  {testResults.roleDisplay}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-gray-900">{testResults.roleDescription}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Hierarchy Level</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-2xl font-bold text-primary-600">{testResults.roleHierarchy}</span>
                  <span className="text-gray-500">/6</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Role Classifications</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {testResults.isFinancial && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Financial Role
                    </span>
                  )}
                  {testResults.isManagement && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Management Role
                    </span>
                  )}
                  {testResults.hasAudit && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      Audit Capabilities
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Permission Tests */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Permission Tests
            </h3>
            
            <div className="space-y-4">
              {renderTestResult(testResults.permissionTests?.canViewAllEmployees, 'Can View All Employees')}
              {renderTestResult(testResults.permissionTests?.canManageUsers, 'Can Manage Users')}
              {renderTestResult(testResults.permissionTests?.canApproveLeave, 'Can Approve Leave Requests')}
              {renderTestResult(testResults.permissionTests?.canProcessPayroll, 'Can Process Payroll')}
              {renderTestResult(testResults.permissionTests?.canAuditSystem, 'Can Audit System')}
              {renderTestResult(testResults.canAssignTarget, `Can Assign ${getRoleDisplayName(targetRole)}`)}
              {renderTestResult(testResults.hasHigherThanTarget, `Higher/Equal to ${getRoleDisplayName(targetRole)}`)}
            </div>
          </div>
        </div>

        {/* Assignable Roles */}
        <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <UserGroupIcon className="h-6 w-6 mr-2" />
            Assignable Roles
          </h3>
          
          {testResults.assignableRoles?.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testResults.assignableRoles.map((role: string) => (
                <div key={role} className="border rounded-lg p-4">
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border mb-2 ${getBadgeColor(role)}`}>
                    {getRoleDisplayName(role)}
                  </div>
                  <p className="text-sm text-gray-600">{getRoleDescription(role)}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Level: {ROLE_HIERARCHY[role] || 0}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <XCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>This role cannot assign any other roles</p>
            </div>
          )}
        </div>

        {/* All Roles Overview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Complete Role Hierarchy
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(ROLE_DISPLAY_NAMES)
              .sort(([,], [,]) => 0) // Keep original order
              .map(([role, displayName]) => (
                <div key={role} className={`border-2 rounded-lg p-4 ${currentRole === role ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border mb-2 ${getBadgeColor(role)}`}>
                    {displayName}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{ROLE_DESCRIPTIONS[role]}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Level: {ROLE_HIERARCHY[role] || 0}</span>
                    {currentRole === role && (
                      <span className="text-primary-600 font-medium">Current</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Test Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-start">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-lg font-semibold text-blue-900 mb-2">How to Test</h4>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>• Change the "Current User Role" to test different permission levels</li>
                <li>• Modify the "Target Role" to test role assignment capabilities</li>
                <li>• Green checkmarks indicate permissions the current role has</li>
                <li>• Red X marks show denied permissions for the current role</li>
                <li>• The hierarchy level determines overall access level (higher = more access)</li>
                <li>• Role classifications show specialized capabilities (Financial, Management, Audit)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}