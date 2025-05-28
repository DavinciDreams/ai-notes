import { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileText, Palette, Mic, Search, Users, Brain } from 'lucide-react';

// Minimal App component to test step by step
function MinimalApp() {
  const [step, setStep] = useState(1);
  const queryClient = new QueryClient();

  const nextStep = () => setStep(step + 1);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🚀 AI Notes - Debugging Steps
        </h1>
        
        {step >= 1 && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              ✅ Step 1: Basic React + Tailwind
            </h2>
            <p className="text-gray-700">React is working and Tailwind CSS is applied!</p>
            <button 
              onClick={nextStep}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Test Step 2: Icons
            </button>
          </div>
        )}        {step >= 2 && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              ✅ Step 2: Lucide Icons
            </h2>
            <div className="flex items-center gap-4 text-gray-700 mb-4">
              <span>Testing icons:</span>
              <FileText className="w-5 h-5" />
              <Palette className="w-5 h-5" />
              <Mic className="w-5 h-5" />
              <Search className="w-5 h-5" />
              <Brain className="w-5 h-5" />
              <Users className="w-5 h-5" />
            </div>
            <button 
              onClick={nextStep}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Test Step 3: Router
            </button>
          </div>
        )}        {step >= 3 && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              ✅ Step 3: React Router
            </h2>
            <p className="text-gray-700">Router components loading...</p>
            <Router>
              <div className="bg-gray-100 p-3 rounded mt-2">
                <p className="text-sm">✅ BrowserRouter is working!</p>
              </div>
            </Router>
            <button 
              onClick={nextStep}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Test Step 4: React Query
            </button>
          </div>
        )}        {step >= 4 && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              ✅ Step 4: React Query
            </h2>
            <QueryClientProvider client={queryClient}>
              <div className="bg-gray-100 p-3 rounded mt-2">
                <p className="text-sm">✅ React Query is working!</p>
              </div>
            </QueryClientProvider>
            <button 
              onClick={nextStep}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Test Step 5: Load Full App
            </button>
          </div>
        )}

        {step >= 5 && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold text-blue-600 mb-2">
              🔄 Step 5: Loading Full App...
            </h2>
            <p className="text-gray-700">All dependencies work! Let's try the full App component.</p>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                If this works, we'll know the issue was with a specific component inside the App.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MinimalApp;
