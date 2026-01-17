import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useMutation } from 'react-query';
import axios from 'axios';

const SkeletonOverlay = React.memo(({ landmarks, videoRef }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    if (!landmarks || landmarks.length === 0) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Only resize canvas if dimensions actually changed (performance)
    if (canvas.width !== video.offsetWidth || canvas.height !== video.offsetHeight) {
      canvas.width = video.offsetWidth;
      canvas.height = video.offsetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scaling factors
    const scaleX = canvas.width;
    const scaleY = canvas.height;

    // Draw Connections (Simplified list of pose connections)
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24],                   // Torso
      [23, 25], [25, 27], [24, 26], [26, 28]         // Legs
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;

    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && p1.visibility > 0.2 && p2.visibility > 0.2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
        ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
        ctx.stroke();
      }
    });

    // Draw Joints
    ctx.fillStyle = '#FF0000';
    landmarks.forEach((lm) => {
      if (lm.visibility > 0.2) {
        ctx.beginPath();
        ctx.arc(lm.x * scaleX, lm.y * scaleY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [landmarks, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-96 pointer-events-none z-10"
    />
  );
});

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
  const [calories, setCalories] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('ready');
  const [landmarks, setLandmarks] = useState([]);
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
      formData.append('sessionId', sessionData.id || sessionId || 'new');

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
          setCalories(data.calories || 0);
          setStatus(data.status);
          setFeedback(data.feedback);
          setLandmarks(data.landmarks || []);
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

      // Optimization: Resize to a smaller resolution for AI analysis
      // 320x240 is enough for MediaPipe Pose Lite and reduces bandwidth significantly
      const TARGET_WIDTH = 320;
      const TARGET_HEIGHT = 240;

      if (canvas.width !== TARGET_WIDTH || canvas.height !== TARGET_HEIGHT) {
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
      }

      context.drawImage(video, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.5);
      });
    }
    console.warn('AI Logic: captureFrame failed - missing refs', !!videoRef.current, !!canvasRef.current);
    return null;
  }, []);

  const startWorkout = async () => {
    try {
      await startCamera();

      const newSessionInfo = {
        name: `AI ${(exerciseType || 'Workout').charAt(0).toUpperCase() + (exerciseType || 'Workout').slice(1)} Session`,
        type: ['walk', 'jogging', 'running'].includes(exerciseType) ? 'cardio' : 'strength',
        exerciseType,
        startTime: new Date().toISOString(),
        userId: user.userId
      };

      startSessionMutation.mutate(newSessionInfo);
      setSessionData(prev => ({ ...prev, ...newSessionInfo }));
      setIsRecording(true);
      setStatus('active');

      // Start real-time analysis handled by useEffect now

    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Failed to start workout');
    }
  };

  // Real-time analysis loop
  useEffect(() => {
    let isActive = true;

    const analyzeLoop = async () => {
      if (!isRecording || !isActive) return;

      try {
        const frameBlob = await captureFrame();
        if (frameBlob && isActive) {
          await realTimeAnalysisMutation.mutateAsync(frameBlob);
        }
      } catch (error) {
        console.error('Frame analysis error:', error);
      }

      if (isActive && isRecording) {
        // Reduced delay for better responsiveness, requestAnimationFrame would be ideal but 
        // we are limited by network latency. 30ms reduces idle time.
        setTimeout(analyzeLoop, 30);
      }
    };

    if (isRecording) {
      analyzeLoop();
    }

    return () => {
      isActive = false;
    };
  }, [isRecording, captureFrame]);
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
    if (!status) return 'text-gray-500';
    switch (status) {
      case 'ready': return 'text-blue-500';
      case 'active': return 'text-green-500';
      case 'paused': return 'text-yellow-500';
      case 'completed': return 'text-blue-500';
      case 'no_person': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const getFeedbackColor = (feedback) => {
    if (feedback.includes('Good') || feedback.includes('Great') || feedback.includes('Excellent')) {
      return 'text-green-600';
    } else if (feedback.includes('Error') || feedback.includes('Could not')) {
      return 'text-red-600';
    }
    return 'text-yellow-600';
  };

  // Text-to-Speech
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      // Cancel previous utterances to avoid queue buildup for fast updates
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Speak feedback when it changes
  useEffect(() => {
    if (feedback && !feedback.includes('Error') && status === 'active') {
      // Debounce or logic to prevent repetition can be added, 
      // but for now only speak if significant change or simple feedback
      speak(feedback);
    }
  }, [feedback, status, speak]);

  // Speak count
  useEffect(() => {
    if (currentCount > 0) {
      speak(currentCount.toString());
    }
  }, [currentCount, speak]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">AI Workout Session</h1>
            <div className="flex items-center space-x-4">
              <span className={`text-lg font-semibold ${getStatusColor(status)}`}>
                Status: {getStatusText(status)}
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
                <SkeletonOverlay landmarks={landmarks} videoRef={videoRef} />
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
                    <span className="font-medium">
                      {exerciseOptions.find(opt => opt.value === exerciseType)?.label || 'Select exercise'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reps:</span>
                    <span className="font-bold text-blue-600">{currentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Calories:</span>
                    <span className="font-bold text-orange-600">{calories.toFixed(1)} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${getStatusColor(status)}`}>
                      {getStatusText(status)}
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
                          Math.floor((new Date().getTime() - new Date(sessionData.startTime).getTime()) / 1000) + 's' :
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