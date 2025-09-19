import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, AlertTriangle, Database, RefreshCw, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const DataConsistencyIndicator = () => {
  const [consistencyData, setConsistencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {

    // Add a delay to ensure the API is properly initialized
    const timer = setTimeout(() => {
      console.log('🔍 Starting delayed consistency check...');
      checkConsistency();
    }, 2000); // Increased delay to 2 seconds
    
    // Check consistency every 5 minutes
    const interval = setInterval(checkConsistency, 300000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const checkConsistency = async (retryCount = 0) => {
    try {
      setChecking(true);
      
      const token = localStorage.getItem('token');
      const response = await api.get('/maintenance/quick-check');
      if (!response) {
        throw new Error('No response received from server');
      }
      
      const data = response.data || response;
      setConsistencyData(data);
    } catch (error) {
      console.error(`❌ Error checking data consistency (attempt ${retryCount + 1}):`, error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error response:', error?.response);
      console.error('❌ Error status:', error?.response?.status);
      console.error('❌ Error data:', error?.response?.data);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error name:', error?.name);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      try {
        const testResponse = await fetch(api.defaults.baseURL.replace('/api', '/'));
      } catch (connectError) {
        console.error('❌ Basic connectivity test failed:', connectError);
      }
      
      // Retry logic for timeout errors
      if (error?.code === 'ECONNABORTED' && retryCount < 2) {
        console.log(`🔄 Retrying due to timeout... (${retryCount + 1}/2)`);
        setTimeout(() => checkConsistency(retryCount + 1), 2000);
        return;
      }
      
      let errorMessage = 'Failed to check consistency';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (error?.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - server is taking too long to respond';
      } else if (!error?.response) {
        errorMessage = 'Network error - no response from server';
      }
      
      setConsistencyData({
        hasInconsistencies: true,
        totalOrphaned: -1,
        error: errorMessage,
        details: {}
      });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const handleDetailedReport = () => {
    // Navigate to the reports page with the data maintenance section
    window.location.href = '/reports#data-maintenance';
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md border">
        <Database className="h-3 w-3" />
        <span className="text-xs">Checking...</span>
        <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
      </div>
    );
  }

  const isHealthy = consistencyData && !consistencyData.hasInconsistencies;
  const hasError = consistencyData && consistencyData.error;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${
      hasError 
        ? 'border-red-300 bg-red-50 text-red-700' 
        : isHealthy 
          ? 'border-green-300 bg-green-50 text-green-700' 
          : 'border-yellow-300 bg-yellow-50 text-yellow-700'
    }`}>
      <Database className="h-3 w-3" />
      
      {hasError ? (
        <>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span title={consistencyData?.error}>Check failed</span>
        </>
      ) : isHealthy ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>Consistent</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          <span>{consistencyData?.totalOrphaned} orphaned</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDetailedReport}
            className="h-4 w-4 p-0 text-yellow-600 hover:text-yellow-800"
          >
            <span className="text-xs">→</span>
          </Button>
        </>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={checkConsistency}
        disabled={checking}
        className="h-4 w-4 p-0 ml-1"
      >
        <RefreshCw className={`h-2.5 w-2.5 ${checking ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};

export default DataConsistencyIndicator;
