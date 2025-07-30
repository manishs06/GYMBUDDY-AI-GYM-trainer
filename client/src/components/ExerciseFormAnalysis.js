import React, { useState, useRef } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const ExerciseFormAnalysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [exerciseType, setExerciseType] = useState('push-up');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const exerciseOptions = [
    { value: 'push-up', label: 'Push-Up', description: 'Upper body strength exercise' },
    { value: 'pull-up', label: 'Pull-Up', description: 'Upper body pulling exercise' },
    { value: 'sit-up', label: 'Sit-Up', description: 'Core strengthening exercise' },
    { value: 'squat', label: 'Squat', description: 'Lower body strength exercise' },
    { value: 'walk', label: 'Walking', description: 'Cardiovascular exercise' }
  ];

  // Form analysis mutation
  const formAnalysisMutation = useMutation(
    async (formData) => {
      const response = await axios.post('/api/ai/analyze-form', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        setAnalysisResult(data);
        setIsAnalyzing(false);
        toast.success('Form analysis completed!');
      },
      onError: (error) => {
        setIsAnalyzing(false);
        toast.error('Analysis failed. Please try again.');
        console.error('Form analysis error:', error);
      }
    }
  );

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please select an image or video file');
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append('media', selectedFile);
    formData.append('exerciseName', exerciseType);
    
    formAnalysisMutation.mutate(formData);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getQualityScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityScoreText = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Exercise Form Analysis</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Media File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: JPG, PNG, MP4, MOV (Max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {selectedFile.name}
                </p>
                <p className="text-xs text-blue-600">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Form'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="space-y-4">
            {analysisResult && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Analysis Results</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-700">Exercise:</span>
                    <span className="font-medium text-green-900">
                      {exerciseOptions.find(opt => opt.value === analysisResult.exercise_type)?.label}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Total Reps:</span>
                    <span className="font-bold text-green-900">{analysisResult.total_count}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Status:</span>
                    <span className="font-medium text-green-900 capitalize">{analysisResult.status}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700">Quality Score:</span>
                    <span className={`font-bold ${getQualityScoreColor(analysisResult.quality_score || 0)}`}>
                      {analysisResult.quality_score || 0}/100 ({getQualityScoreText(analysisResult.quality_score || 0)})
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded border">
                  <h4 className="font-medium text-green-900 mb-2">AI Feedback:</h4>
                  <p className="text-sm text-green-800">{analysisResult.feedback}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">How to Use</h3>
              <ul className="text-sm text-yellow-800 space-y-2">
                <li>• Select the exercise type you want to analyze</li>
                <li>• Upload a video or image of your exercise form</li>
                <li>• Ensure good lighting and clear visibility</li>
                <li>• The AI will analyze your form and provide feedback</li>
                <li>• Results include rep count and form quality assessment</li>
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips for Better Analysis</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Record from a side angle for better pose detection</li>
                <li>• Ensure your full body is visible in the frame</li>
                <li>• Use good lighting to avoid shadows</li>
                <li>• Wear form-fitting clothing for better tracking</li>
                <li>• Perform the exercise at a normal pace</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        {analysisResult && analysisResult.frame_analysis && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Detailed Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisResult.frame_analysis.slice(-5).map((frame, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Frame {index + 1}</span>
                    <span className="text-xs text-gray-500">
                      Count: {frame.count}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <p>Status: {frame.status}</p>
                    <p className="truncate">Feedback: {frame.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseFormAnalysis; 