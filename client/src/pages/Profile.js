import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    fitnessLevel: user?.fitnessLevel || 'beginner',
    goals: user?.goals || [],
    biometrics: {
      age: user?.biometrics?.age || '',
      weight: user?.biometrics?.weight || '',
      height: user?.biometrics?.height || '',
      gender: user?.biometrics?.gender || 'male'
    },
    preferences: {
      workoutDuration: user?.preferences?.workoutDuration || 30,
      notifications: user?.preferences?.notifications || true
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const fitnessLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const availableGoals = [
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'flexibility', label: 'Flexibility' },
    { value: 'strength', label: 'Strength' }
  ];

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGoalChange = (goal) => {
    setProfileData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const handleBiometricChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      biometrics: {
        ...prev.biometrics,
        [name]: value
      }
    }));
  };

  const handlePreferenceChange = (key, value) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const generateNutritionPlan = async () => {
    setLoadingPlan(true);
    try {
      const response = await axios.post('/api/ai/nutrition-plan', {
        ...profileData.biometrics,
        goals: profileData.goals,
        activity_level: 'moderate' // could be added to profile later
      });
      setNutritionPlan(response.data.nutrition_plan);
      toast.success("Nutrition Plan Generated!");
    } catch (error) {
      toast.error("Failed to generate plan. Ensure biometrics are saved.");
      console.error(error);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePasswordChange = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordChange()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setErrors({});
      }
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={profileData.username}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fitness Level
                    </label>
                    <select
                      name="fitnessLevel"
                      value={profileData.fitnessLevel}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {fitnessLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workout Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="workoutDuration"
                      value={profileData.preferences.workoutDuration}
                      onChange={(e) => handlePreferenceChange('workoutDuration', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min="10"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fitness Goals
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableGoals.map(goal => (
                      <label key={goal.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profileData.goals.includes(goal.value)}
                          onChange={() => handleGoalChange(goal.value)}
                          disabled={!isEditing}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">{goal.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Biometrics & Nutrition</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                      <input type="number" name="age" value={profileData.biometrics.age} onChange={handleBiometricChange} disabled={!isEditing} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                      <input type="number" name="weight" value={profileData.biometrics.weight} onChange={handleBiometricChange} disabled={!isEditing} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                      <input type="number" name="height" value={profileData.biometrics.height} onChange={handleBiometricChange} disabled={!isEditing} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <select name="gender" value={profileData.biometrics.gender} onChange={handleBiometricChange} disabled={!isEditing} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* BMI Calculator Display */}
                  {profileData.biometrics && profileData.biometrics.weight && profileData.biometrics.height && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-blue-900">BMI Calculation</h4>
                        <p className="text-blue-700">
                          Your Body Mass Index:
                          <span className="font-bold text-xl ml-2">
                            {(profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)).toFixed(1)}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold
                          ${(profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)) < 18.5 ? 'bg-yellow-200 text-yellow-800' :
                            (profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)) < 25 ? 'bg-green-200 text-green-800' :
                              (profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)) < 30 ? 'bg-orange-200 text-orange-800' :
                                'bg-red-200 text-red-800'
                          }
                        `}>
                          {(profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)) < 18.5 ? 'Underweight' :
                            (profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)) < 25 ? 'Normal Weight' :
                              (profileData.biometrics.weight / Math.pow(profileData.biometrics.height / 100, 2)) < 30 ? 'Overweight' : 'Obese'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="mt-4">
                      <button type="button" onClick={generateNutritionPlan} disabled={loadingPlan} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                        {loadingPlan ? 'Generating...' : 'Generate Nutrition Plan'}
                      </button>

                      {nutritionPlan && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-bold text-green-900 mb-2">Your Personal Plan</h4>
                          <p><strong>Calories:</strong> {nutritionPlan.daily_calories} kcal/day</p>
                          <p><strong>Protein:</strong> {nutritionPlan.macros.protein}g</p>
                          <p><strong>Carbs:</strong> {nutritionPlan.macros.carbs}g</p>
                          <p><strong>Fats:</strong> {nutritionPlan.macros.fats}g</p>
                          <p><strong>Hydration:</strong> {nutritionPlan.hydration_target} L/day</p>
                          <ul className="mt-2 list-disc pl-5 text-sm">
                            {nutritionPlan.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profileData.preferences.notifications}
                      onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                      disabled={!isEditing}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable notifications</span>
                  </label>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Account Security</h2>
            </div>
            <div className="p-6">
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white rounded-lg shadow mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Account Stats</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Member since</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last login</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(user?.lastLogin).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total sessions</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.stats?.totalSessions || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Streak days</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.stats?.streakDays || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div >

      {/* Password Change Modal */}
      {
        isChangingPassword && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.currentPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.newPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        setErrors({});
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Profile; 