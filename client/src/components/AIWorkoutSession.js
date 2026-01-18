import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useMutation } from 'react-query';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

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

  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef(null);

  const exerciseOptions = [
    { value: 'push-up', label: 'Push-Up', description: 'Upper body strength exercise', image: '/images/exercises/pushup.png' },
    { value: 'pull-up', label: 'Pull-Up', description: 'Upper body pulling exercise', image: '/images/exercises/pullup.png' },
    { value: 'sit-up', label: 'Sit-Up', description: 'Core strengthening exercise', image: '/images/exercises/situp.png' },
    { value: 'squat', label: 'Squat', description: 'Lower body strength exercise', image: '/images/exercises/squat.png' },
    { value: 'walk', label: 'Walking', description: 'Cardiovascular exercise', image: '/images/exercises/walk.png' }
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
      setIsCountingDown(true);
      setCountdown(5);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            startActualWorkout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Failed to start workout');
    }
  };

  const startActualWorkout = () => {
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
    setIsCountingDown(false);
    setStatus('active');
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
    <div className="min-h-screen bg-neutral-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <header className="flex items-center justify-between mb-8">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent"
          >
            GymBuddy AI Trainer
          </motion.h1>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-neutral-400 font-medium uppercase tracking-widest">Live Reps</p>
              <motion.p
                key={currentCount}
                initial={{ scale: 1.5, color: '#60a5fa' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-3xl font-black"
              >
                {currentCount}
              </motion.p>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-right">
              <p className="text-sm text-neutral-400 font-medium uppercase tracking-widest">Calories</p>
              <p className="text-3xl font-black text-orange-500">{calories.toFixed(1)}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Workspace */}
          <div className="xl:col-span-2 space-y-6">
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <SkeletonOverlay landmarks={landmarks} videoRef={videoRef} />
              <canvas ref={canvasRef} className="hidden" />

              {/* Countdown Overlay */}
              <AnimatePresence>
                {isCountingDown && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                  >
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-[12rem] font-black text-white italic drop-shadow-2xl"
                    >
                      {countdown}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HUD / Premium Overlay */}
              {isRecording && (
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80">Rec Program: {exerciseType}</span>
                      </div>
                      <p className={`text-sm font-semibold mt-1 ${getStatusColor(status).replace('text-', 'text-opacity-100 ')}`}>
                        {getStatusText(status)}
                      </p>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-white/40 mb-1">Stability Meter</p>
                      <div className="w-32 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: landmarks.length > 0 ? '85%' : '0%' }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={feedback}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className="max-w-md bg-blue-600/90 backdrop-blur-xl p-5 rounded-2xl border border-blue-400/30 self-center mb-4 shadow-2xl"
                    >
                      <p className="text-center font-bold text-lg leading-tight">
                        {feedback || "System Initializing..."}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {!isRecording && !isCountingDown && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-2">Ready to Transform?</h3>
                    <p className="text-neutral-400">Select your program to initialize tracking</p>
                  </div>
                </div>
              )}
            </div>

            {/* Exercise Selection Grid */}
            {!isRecording && !isCountingDown && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {exerciseOptions.map((option) => (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExerciseType(option.value)}
                    className={`cursor-pointer group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${exerciseType === option.value ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-neutral-800'
                      }`}
                  >
                    <div className="aspect-[4/3] relative">
                      <img src={option.image} alt={option.label} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-left">
                        <h4 className="font-bold text-lg">{option.label}</h4>
                        <p className="text-[10px] text-neutral-400 leading-tight line-clamp-1">{option.description}</p>
                      </div>
                      {exerciseType === option.value && (
                        <div className="absolute top-2 right-2 bg-blue-500 p-1 rounded-full text-white shadow-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-4">
              {!isRecording && !isCountingDown ? (
                <button
                  onClick={startWorkout}
                  disabled={startSessionMutation.isLoading}
                  className="flex-1 bg-white text-black font-black py-5 rounded-2xl hover:bg-neutral-200 transition-all text-xl uppercase tracking-widest disabled:opacity-50"
                >
                  {startSessionMutation.isLoading ? 'Syncing...' : 'Initiate Session'}
                </button>
              ) : isRecording ? (
                <button
                  onClick={stopWorkout}
                  disabled={endSessionMutation.isLoading}
                  className="flex-1 bg-red-600 text-white font-black py-5 rounded-2xl hover:bg-red-700 transition-all text-xl uppercase tracking-widest shadow-2xl shadow-red-900/40"
                >
                  {endSessionMutation.isLoading ? 'Saving Data...' : 'Terminate Session'}
                </button>
              ) : null}
            </div>
          </div>

          {/* Side Panel: Metrics & Stats */}
          <div className="space-y-6">
            <div className="bg-neutral-800/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full" />
                Session Intelligence
              </h3>
              <div className="space-y-4">
                <div className="bg-neutral-900/50 p-4 rounded-2xl flex justify-between items-center border border-neutral-800">
                  <span className="text-neutral-400 font-medium">Program</span>
                  <span className="font-bold text-blue-400 uppercase">{exerciseType}</span>
                </div>
                <div className="bg-neutral-900/50 p-4 rounded-2xl flex justify-between items-center border border-neutral-800">
                  <span className="text-neutral-400 font-medium">Form Analysis</span>
                  <span className={`font-bold ${landmarks.length > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {landmarks.length > 0 ? 'Active Tracking' : 'Searching...'}
                  </span>
                </div>
                <div className="bg-neutral-900/50 p-4 rounded-2xl flex justify-between items-center border border-neutral-800">
                  <span className="text-neutral-400 font-medium">Session Energy</span>
                  <span className="font-bold text-orange-400">{calories.toFixed(2)} kcal</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/50 backdrop-blur-md rounded-3xl p-6 border border-blue-500/20">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-white rounded-full" />
                Live Instruction
              </h3>
              <div className="space-y-3">
                {exerciseOptions.find(opt => opt.value === exerciseType)?.description.split(' ').map((word, i) => (
                  <p key={i} className="text-blue-100/70 text-sm italic">• {word}</p>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 backdrop-blur-md rounded-3xl p-6 border border-yellow-500/20">
              <h4 className="text-yellow-500 font-bold uppercase tracking-widest text-[10px] mb-2">Pro Tip</h4>
              <p className="text-sm text-yellow-200/80 leading-snug">
                Ensure your full body is visible in the frame for maximum tracking precision. Good lighting improves detection speed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWorkoutSession;