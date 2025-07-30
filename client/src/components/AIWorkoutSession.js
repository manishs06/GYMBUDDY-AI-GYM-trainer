import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useMutation } from 'react-query';
import axios from 'axios';

const AIWorkoutSession = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [exerciseType, setExerciseType] = useState('push-up');
  const [currentCount, setCurrentCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('ready');
  const [sessionData, setSessionData] = useState({
    startTime: null,
    endTime: null,
    totalReps: 0,
    exerciseType: '',
    qualityScore: 0
  });

  const exerciseOptions = [
    { value: 'push-up', label: 'Push-Up', description: 'Upper body strength exercise' },
    { value: 'pull-up', label: 'Pull-Up', description: 'Upper body pulling exercise' },
    { value: 'sit-up', label: 'Sit-Up', description: 'Core strengthening exercise' },
    { value: 'squat', label: 'Squat', description: 'Lower body strength exercise' },
    { value: 'walk', label: 'Walking', description: 'Cardiovascular exercise' }
  ];

  // Real-time analysis mutation
  const realTimeAnalysisMutation = useMutation(
    async (frameData) => {
      const formData = new FormData();
      formData.append('frame', frameData, 'frame.jpg');
      formData.append('exerciseType', exerciseType);
      formData.append('sessionId', sessionId || 'new');
      
      const response = await axios.post('/api/ai/real-time-analysis', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data.success) {
          setCurrentCount(data.count);
          setStatus(data.status);
          setFeedback(data.feedback);
        }
      },
      onError: (error) => {
        console.error('Real-time analysis error:', error);
      }
    }
  );

  // Start session mutation
  const startSessionMutation = useMutation(
    async (sessionData) => {
      const response = await axios.post('/api/sessions', sessionData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Workout session started!');
        setSessionData(prev => ({ ...prev, id: data.session._id }));
      },
      onError: (error) => {
        toast.error('Failed to start session');
        console.error('Start session error:', error);
      }
    }
  );

  // End session mutation
  const endSessionMutation = useMutation(
    async (sessionData) => {
      const response = await axios.put(`/api/sessions/${sessionData.id}`, {
        endTime: new Date().toISOString(),
        totalReps: currentCount,
        qualityScore: calculateQualityScore()
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Workout session completed!');
        navigate('/dashboard');
      },
      onError: (error) => {
        toast.error('Failed to end session');
        console.error('End session error:', error);
      }
    }
  );

  const calculateQualityScore = () => {
    // Simple quality score calculation based on rep count and session duration
    const duration = sessionData.startTime ? (Date.now() - new Date(sessionData.startTime).getTime()) / 1000 : 0;
    const repsPerMinute = duration > 0 ? (currentCount / duration) * 60 : 0;
    
    // Score based on reps per minute (ideal range: 10-20 reps/min for most exercises)
    if (repsPerMinute >= 10 && repsPerMinute <= 20) return 90;
    if (repsPerMinute >= 8 && repsPerMinute <= 25) return 75;
    if (repsPerMinute >= 5 && repsPerMinute <= 30) return 60;
    return 40;
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
    }
    return null;
  }, []);

  const startWorkout = async () => {
    try {
      await startCamera();
      
      const sessionData = {
        exerciseType,
        startTime: new Date().toISOString(),
        userId: user.userId
      };
      
      startSessionMutation.mutate(sessionData);
      setSessionData(prev => ({ ...prev, ...sessionData }));
      setIsRecording(true);
      setStatus('active');
      
      // Start real-time analysis
      const analysisInterval = setInterval(async () => {
        if (isRecording) {
          const frameBlob = await captureFrame();
          if (frameBlob) {
            realTimeAnalysisMutation.mutate(frameBlob);
          }
        } else {
          clearInterval(analysisInterval);
        }
      }, 1000); // Analyze every second
      
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Failed to start workout');
    }
  };

  const stopWorkout = async () => {
    setIsRecording(false);
    setStatus('completed');
    stopCamera();
    
    if (sessionData.id) {
      endSessionMutation.mutate(sessionData);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'text-gray-500';
      case 'active': return 'text-green-500';
      case 'completed': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getFeedbackColor = (feedback) => {
    if (feedback.includes('Good') || feedback.includes('Great') || feedback.includes('Excellent')) {
      return 'text-green-600';
    } else if (feedback.includes('Error') || feedback.includes('Could not')) {
      return 'text-red-600';
    }
    return 'text-yellow-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">AI Workout Session</h1>
            <div className="flex items-center space-x-4">
              <span className={`text-lg font-semibold ${getStatusColor(status)}`}>
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <div className="text-2xl font-bold text-blue-600">
                Count: {currentCount}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Feed */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-96 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {!isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <p className="text-lg">Camera will start when workout begins</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Exercise Selection */}
              {!isRecording && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Exercise Type
                  </label>
                  <select
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {exerciseOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex space-x-4">
                {!isRecording ? (
                  <button
                    onClick={startWorkout}
                    disabled={startSessionMutation.isLoading}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {startSessionMutation.isLoading ? 'Starting...' : 'Start Workout'}
                  </button>
                ) : (
                  <button
                    onClick={stopWorkout}
                    disabled={endSessionMutation.isLoading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {endSessionMutation.isLoading ? 'Ending...' : 'End Workout'}
                  </button>
                )}
              </div>
            </div>

            {/* Analysis Panel */}
            <div className="space-y-6">
              {/* Real-time Feedback */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Real-time Feedback</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exercise:</span>
                    <span className="font-medium">{exerciseOptions.find(opt => opt.value === exerciseType)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reps:</span>
                    <span className="font-bold text-blue-600">{currentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Feedback */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">AI Feedback</h3>
                <p className={`text-sm ${getFeedbackColor(feedback)}`}>
                  {feedback || 'Start your workout to receive real-time feedback'}
                </p>
              </div>

              {/* Session Info */}
              {sessionData.startTime && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">Session Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Started:</span>
                      <span className="text-green-900">
                        {new Date(sessionData.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Duration:</span>
                      <span className="text-green-900">
                        {sessionData.startTime ? 
                          Math.floor((Date.now() - new Date(sessionData.startTime).getTime()) / 1000) + 's' : 
                          '0s'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Instructions</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Position yourself in front of the camera</li>
                  <li>• Ensure good lighting for better detection</li>
                  <li>• Follow the exercise form shown in the feedback</li>
                  <li>• The AI will count your reps automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWorkoutSession; 