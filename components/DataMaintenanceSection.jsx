import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, Database, RefreshCw, Loader2, Download, Trash2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const DataMaintenanceSection = () => {
  const [consistencyData, setConsistencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [detailedReport, setDetailedReport] = useState(null);

  useEffect(() => {
    checkConsistency();
  }, []);

  const checkConsistency = async () => {
    try {
      setChecking(true);
      const response = await api.get('/maintenance/quick-check');
      
      console.log('✅ Maintenance check response:', response);
      
      // Handle both response.data and direct response cases
      const data = response.data || response;
      setConsistencyData(data);
    } catch (error) {
      console.error('❌ Error checking data consistency:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      toast.error(error.response?.data?.message || error.message || 'Failed to check data consistency');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const getDetailedReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/maintenance/consistency-report');
      
      console.log('✅ Detailed report response:', response);
      
      // Handle both response.data and direct response cases
      const data = response.data || response;
      setDetailedReport(data);
    } catch (error) {
      console.error('❌ Error getting detailed report:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      toast.error(error.response?.data?.message || error.message || 'Failed to get detailed consistency report');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedRecords = async (dryRun = true) => {
    try {
      setCleaning(true);
      const response = await api.post('/maintenance/cleanup-orphaned', { dryRun });
      
      if (dryRun) {
        toast.success('Dry run completed - check console for details');
      } else {
        toast.success('Cleanup completed successfully');
        // Refresh the consistency check after cleanup
        await checkConsistency();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Failed to cleanup orphaned records');
    } finally {
      setCleaning(false);
    }
  };

  const performDataConsistencyCheck = async () => {
    try {
      setChecking(true);
      const response = await api.post('/maintenance/full-consistency-check', { 
        dryRun: true, 
        autoCleanup: false 
      });
      
      setDetailedReport(response.data);
      toast.success('Data consistency check completed');
    } catch (error) {
      console.error('Error performing consistency check:', error);
      toast.error('Failed to perform consistency check');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading consistency data...</span>
      </div>
    );
  }

  const isHealthy = consistencyData && !consistencyData.hasInconsistencies;
  const hasError = consistencyData && consistencyData.error;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border-2 ${
          hasError 
            ? 'border-red-200 bg-red-50' 
            : isHealthy 
              ? 'border-green-200 bg-green-50' 
              : 'border-yellow-200 bg-yellow-50'
        }`}>
          <div className="flex items-center gap-3">
            {hasError ? (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            ) : isHealthy ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            )}
            <div>
              <h3 className="font-semibold">
                {hasError ? 'Status Check Failed' : isHealthy ? 'Data Consistent' : 'Inconsistencies Found'}
              </h3>
              <p className="text-sm text-gray-600">
                {hasError 
                  ? 'Unable to verify data consistency' 
                  : isHealthy 
                    ? 'All data relationships are intact' 
                    : `${consistencyData?.totalOrphaned} orphaned records detected`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-gray-50">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="font-semibold">Auto-Cleanup Status</h3>
              <p className="text-sm text-gray-600">
                Automatic cleanup runs after every deletion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inconsistency Details */}
      {!isHealthy && !hasError && consistencyData?.details && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-yellow-800">Found {consistencyData.totalOrphaned} orphaned records:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {consistencyData.details.orphanedSubmissions > 0 && (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {consistencyData.details.orphanedSubmissions} submissions
                  </Badge>
                )}
                {consistencyData.details.orphanedInternalMarks > 0 && (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {consistencyData.details.orphanedInternalMarks} internal marks
                  </Badge>
                )}
                {consistencyData.details.orphanedTests > 0 && (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {consistencyData.details.orphanedTests} tests
                  </Badge>
                )}
                {consistencyData.details.orphanedStudents > 0 && (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {consistencyData.details.orphanedStudents} students
                  </Badge>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={checkConsistency}
          disabled={checking}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Refresh Status'}
        </Button>

        <Button
          onClick={getDetailedReport}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Detailed Report
        </Button>

        <Button
          onClick={performDataConsistencyCheck}
          disabled={checking}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          Full Consistency Check
        </Button>

        {!isHealthy && !hasError && (
          <>
            <Button
              onClick={() => cleanupOrphanedRecords(true)}
              disabled={cleaning}
              variant="outline"
              className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Loader2 className={`h-4 w-4 ${cleaning ? 'animate-spin' : 'hidden'}`} />
              <Database className={`h-4 w-4 ${cleaning ? 'hidden' : ''}`} />
              Dry Run Cleanup
            </Button>

            <Button
              onClick={() => cleanupOrphanedRecords(false)}
              disabled={cleaning}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <Loader2 className={`h-4 w-4 ${cleaning ? 'animate-spin' : 'hidden'}`} />
              <Trash2 className={`h-4 w-4 ${cleaning ? 'hidden' : ''}`} />
              {cleaning ? 'Cleaning...' : 'Clean Now'}
            </Button>
          </>
        )}
      </div>

      {/* Detailed Report Display */}
      {detailedReport && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-semibold mb-3">Detailed Consistency Report</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Status:</strong> {detailedReport.isConsistent ? 'Consistent' : 'Inconsistent'}</p>
            <p><strong>Total Orphaned Records:</strong> {detailedReport.totalOrphaned}</p>
            <p><strong>Last Checked:</strong> {new Date(detailedReport.lastChecked).toLocaleString()}</p>
            
            {detailedReport.totals && (
              <div className="mt-3">
                <p className="font-medium">Breakdown:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Orphaned Submissions: {detailedReport.totals.submissionsOrphaned}</li>
                  <li>Orphaned Internal Marks: {detailedReport.totals.internalMarksOrphaned}</li>
                  <li>Orphaned Tests: {detailedReport.totals.testsOrphaned}</li>
                  <li>Orphaned Students: {detailedReport.totals.studentsOrphaned}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Section */}
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">About Data Consistency:</p>
          <ul className="text-sm space-y-1">
            <li>• <strong>Auto-cleanup:</strong> Runs automatically after every deletion operation to maintain data integrity</li>
            <li>• <strong>Orphaned records:</strong> Database records that reference deleted entities</li>
            <li>• <strong>Regular monitoring:</strong> Check this section periodically to ensure optimal database health</li>
            <li>• <strong>Safe operations:</strong> All cleanup operations use database transactions for safety</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DataMaintenanceSection;
