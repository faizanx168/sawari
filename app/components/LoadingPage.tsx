import React, { useEffect, useState } from 'react';

interface LoadingPageProps {
  text?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ text = 'Loading...' }) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center animate-fadeIn">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 animate-spin-slow"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 animate-spin-reverse"></div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-700 animate-fadeIn">
          {text}{dots}
        </h2>
      </div>
    </div>
  );
};

export default LoadingPage; 