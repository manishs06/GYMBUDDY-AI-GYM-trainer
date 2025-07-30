import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ExerciseDetail = () => {
  const { id } = useParams();

  const { data: exercise, isLoading, error } = useQuery(
    ['exercise', id],
    async () => {
      const response = await axios.get(`/api/exercises/${id}`);
      return response.data;
    }
  );

  const getCategoryColor = (category) => {
    const colors = {
      strength: 'bg-red-100 text-red-800',
      cardio: 'bg-blue-100 text-blue-800',
      flexibility: 'bg-green-100 text-green-800',
      balance: 'bg-purple-100 text-purple-800',
      functional: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyStars = (difficulty) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < difficulty ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Exercise not found</h3>
          <p className="mt-1 text-sm text-gray-500">The exercise you're looking for doesn't exist.</p>
          <div className="mt-6">
            <Link
              to="/exercises"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Exercises
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex mb-8" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/exercises" className="text-gray-700 hover:text-gray-900">
              Exercises
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-gray-500 md:ml-2">{exercise.name}</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{exercise.name}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(exercise.category)}`}>
                  {exercise.category}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-gray-700 mb-6">{exercise.description}</p>

                {exercise.instructions && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      {exercise.instructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {exercise.tips && exercise.tips.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tips</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      {exercise.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exercise.variations && exercise.variations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Variations</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      {exercise.variations.map((variation, index) => (
                        <li key={index}>{variation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Exercise Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Exercise Info</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Difficulty</span>
                <div className="flex items-center mt-1">
                  {getDifficultyStars(exercise.difficulty || 1)}
                  <span className="ml-2 text-sm text-gray-700">
                    {exercise.difficulty || 1}/5
                  </span>
                </div>
              </div>

              {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Muscle Groups</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {exercise.muscleGroups.map((muscleGroup) => (
                      <span
                        key={muscleGroup}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {muscleGroup.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exercise.equipment && exercise.equipment.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Equipment</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {exercise.equipment.map((equipment) => (
                      <span
                        key={equipment}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {equipment}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Target Muscles</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {exercise.targetMuscles.map((muscle) => (
                      <span
                        key={muscle}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <Link
                to={`/ai-workout?exercise=${exercise._id}`}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start AI Workout
              </Link>
              
              <Link
                to={`/workout?exercise=${exercise._id}`}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manual Workout
              </Link>
            </div>
          </div>

          {/* Related Exercises */}
          {exercise.relatedExercises && exercise.relatedExercises.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Related Exercises</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {exercise.relatedExercises.slice(0, 5).map((relatedExercise) => (
                    <Link
                      key={relatedExercise._id}
                      to={`/exercises/${relatedExercise._id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="text-sm font-medium text-gray-900">{relatedExercise.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{relatedExercise.category}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetail; 