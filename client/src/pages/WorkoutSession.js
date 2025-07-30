import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const WorkoutSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [session, setSession] = useState({
    name: '',
    type: 'mixed',
    exercises: [],
    notes: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch session if editing
  const { data: existingSession, isLoading: sessionLoading } = useQuery(
    ['session', sessionId],
    async () => {
      if (!sessionId) return null;
      const response = await axios.get(`/api/sessions/${sessionId}`);
      return response.data.session;
    },
    {
      enabled: !!sessionId,
      onSuccess: (data) => {
        if (data) {
          setSession({
            name: data.name || '',
            type: data.type || 'mixed',
            exercises: data.exercises || [],
            notes: data.notes || ''
          });
        }
      }
    }
  );

  // Create/Update session mutation
  const createSessionMutation = useMutation(
    async (sessionData) => {
      if (sessionId) {
        const response = await axios.put(`/api/sessions/${sessionId}`, sessionData);
        return response.data;
      } else {
        const response = await axios.post('/api/sessions', sessionData);
        return response.data;
      }
    },
    {
      onSuccess: (data) => {
        toast.success(sessionId ? 'Session updated successfully!' : 'Session created successfully!');
        queryClient.invalidateQueries(['sessions']);
        if (!sessionId) {
          navigate(`/workout/${data.session._id}`);
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to save session');
      }
    }
  );

  // Complete session mutation
  const completeSessionMutation = useMutation(
    async () => {
      const response = await axios.post(`/api/sessions/${sessionId}/complete`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Session completed successfully!');
        queryClient.invalidateQueries(['sessions']);
        navigate('/history');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to complete session');
      }
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSession(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExerciseChange = (index, field, value) => {
    const updatedExercises = [...session.exercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value
    };
    setSession(prev => ({
      ...prev,
      exercises: updatedExercises
    }));
  };

  const addExercise = () => {
    setSession(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exerciseId: '',
          sets: 3,
          reps: 10,
          weight: 0,
          duration: 0,
          formScore: 0,
          notes: ''
        }
      ]
    }));
  };

  const removeExercise = (index) => {
    setSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await createSessionMutation.mutateAsync(session);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) {
      toast.error('Please save the session first');
      return;
    }
    
    setIsLoading(true);
    try {
      await completeSessionMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {sessionId ? 'Edit Workout Session' : 'New Workout Session'}
        </h1>
        <p className="text-gray-600 mt-2">
          {sessionId ? 'Update your workout session details' : 'Create a new workout session'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Session Details</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Name
              </label>
              <input
                type="text"
                name="name"
                value={session.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter session name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Type
              </label>
              <select
                name="type"
                value={session.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility</option>
                <option value="mixed">Mixed</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Exercises</h3>
              <button
                onClick={addExercise}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Exercise
              </button>
            </div>

            {session.exercises.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No exercises added</h3>
                <p className="mt-1 text-sm text-gray-500">Add exercises to your workout session</p>
              </div>
            ) : (
              <div className="space-y-4">
                {session.exercises.map((exercise, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">Exercise {index + 1}</h4>
                      <button
                        onClick={() => removeExercise(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Exercise Name
                        </label>
                        <input
                          type="text"
                          value={exercise.exerciseId}
                          onChange={(e) => handleExerciseChange(index, 'exerciseId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Exercise name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sets
                        </label>
                        <input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => handleExerciseChange(index, 'sets', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reps
                        </label>
                        <input
                          type="number"
                          value={exercise.reps}
                          onChange={(e) => handleExerciseChange(index, 'reps', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          value={exercise.weight}
                          onChange={(e) => handleExerciseChange(index, 'weight', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          value={exercise.duration}
                          onChange={(e) => handleExerciseChange(index, 'duration', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Form Score (%)
                        </label>
                        <input
                          type="number"
                          value={exercise.formScore}
                          onChange={(e) => handleExerciseChange(index, 'formScore', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={exercise.notes}
                          onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Notes
            </label>
            <textarea
              name="notes"
              value={session.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes about your workout session..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/history')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Save Session'}
            </button>

            {sessionId && (
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Complete Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutSession; 