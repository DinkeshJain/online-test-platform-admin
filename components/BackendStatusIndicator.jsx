import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, Server, Wifi, WifiOff, Info } from 'lucide-react';
import api from '../lib/api';

const BackendStatusIndicator = ({ showDetails = false }) => {
  const [backendInfo, setBackendInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    updateBackendInfo();
  }, []);

  const updateBackendInfo = () => {
    const info = api.getBackendInfo();
    setBackendInfo(info);
  };

  const handleRefreshBackend = async () => {
    setLoading(true);
    setError('');
    try {
      const newUrl = await api.refreshBackendUrl();
      updateBackendInfo();
      console.log(`Backend switched to: ${newUrl}`);
    } catch (err) {
      setError('Failed to refresh backend connection');
      console.error('Backend refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!backendInfo) return null;

  const isLocal = backendInfo.isLocal;
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(parseInt(timestamp)).toLocaleTimeString();
  };

  return (
    <div className="space-y-2">
      {/* Compact Status Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {isLocal ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <Server className="h-4 w-4 text-blue-600" />
          )}
          <Badge 
            className={`text-xs ${
              isLocal 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            {isLocal ? 'Local' : 'Deployed'} Backend
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshBackend}
          disabled={loading}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="bg-gray-50 p-3 rounded-lg border text-xs space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <Info className="h-3 w-3" />
            <span className="font-medium">Backend Details</span>
          </div>
          
          <div className="space-y-1 text-gray-600">
            <div className="flex justify-between">
              <span>Current URL:</span>
              <span className="font-mono text-xs break-all">
                {backendInfo.currentUrl}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Checked:</span>
              <span>{formatTime(backendInfo.cacheTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={isLocal ? 'text-green-600' : 'text-blue-600'}>
                {isLocal ? 'Local Development' : 'Production Deployed'}
              </span>
            </div>
          </div>
          
          <div className="pt-1 border-t border-gray-200">
            <p className="text-gray-500 text-xs">
              System automatically detects and switches between local and deployed backends.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BackendStatusIndicator;
