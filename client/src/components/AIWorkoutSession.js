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

    if (canvas.width !== video.offsetWidth || canvas.height !== video.offsetHeight) {
      canvas.width = video.offsetWidth;
      canvas.height = video.offsetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width;
    const scaleY = canvas.height;

    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24],
      [23, 25], [25, 27], [24, 26], [26, 28]
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
    { value: 'push-up', label: 'Push-Up', description: 'Upper body strength exercise' },
    { value: 'pull-up', label: 'Pull-Up', description: 'Upper body pulling exercise' },
    { value: 'sit-up', label: 'Sit-Up', description: 'Core strengthening exercise' },
    { value: 'squat', label: 'Squat', description: 'Lower body strength exercise' },
    { value: 'walk', label: 'Walking', description: 'Cardiovascular exercise' }
  ];

  const realTimeAnalysisMutation = useMutation(
    async (frameData) => {
      const formData = new FormData();
      formData.append('frame', frameData, 'frame.jpg');
      formData.append('exerciseType', exerciseType);
      formData.append('sessionId', sessionData.id || sessionId || 'new');

      const response = await axios.post('/api/ai/real-time-analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
      }
    }
  );

  const startSessionMutation = useMutation(async (data) => axios.post('/api/sessions', data));
  const endSessionMutation = useMutation(async (data) => axios.put(`/api/sessions/${data.id}`, data));

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (e) { toast.error('Camera access failed'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = 320;
      canvas.height = 240;
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      return new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.5));
    }
    return null;
  }, []);

  const startWorkout = async () => {
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
  };

  const startActualWorkout = () => {
    setIsRecording(true);
    setIsCountingDown(false);
    setStatus('active');
  };

  const stopWorkout = () => {
    setIsRecording(false);
    setStatus('completed');
    stopCamera();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'no_person': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <header className="flex items-center justify-between mb-8">
          <motion.h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            GymBuddy AI Trainer
          </motion.h1>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-neutral-400 uppercase">Live Reps</p>
              <p className="text-3xl font-black">{currentCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400 uppercase">Calories</p>
              <p className="text-3xl font-black text-orange-500">{calories.toFixed(1)}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-800">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <SkeletonOverlay landmarks={landmarks} videoRef={videoRef} />

              <AnimatePresence>
                {isCountingDown && (
                  <motion.div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div key={countdown} className="text-[12rem] font-black">{countdown}</motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isRecording && (
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Rec Program: {exerciseType}</span>
                      <p className={`text-sm font-semibold ${getStatusColor(status)}`}>{status}</p>
                    </div>
                  </div>
                  <motion.div className="max-w-md bg-blue-600/90 backdrop-blur-xl p-5 rounded-2xl self-center">
                    <p className="text-center font-bold text-lg">{feedback || "System Initializing..."}</p>
                  </motion.div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {!isRecording ? (
                <button onClick={startWorkout} className="flex-1 bg-white text-black font-black py-5 rounded-2xl text-xl uppercase">Initiate Session</button>
              ) : (
                <button onClick={stopWorkout} className="flex-1 bg-red-600 text-white font-black py-5 rounded-2xl text-xl uppercase">Terminate Session</button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-800/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700/50">
              <h3 className="text-xl font-bold mb-4">Session Intelligence</h3>
              <div className="space-y-4">
                <div className="flex justify-between"><span>Program</span><span className="font-bold text-blue-400">{exerciseType}</span></div>
                <div className="flex justify-between"><span>Active Tracking</span><span className="font-bold text-green-400">{landmarks.length > 0 ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWorkoutSession;