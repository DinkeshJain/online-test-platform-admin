import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { 
  Database, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Home,
  ArrowLeft,
  Settings,
  Info
} from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import api from '../lib/api';

const DataMaintenance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [consistencyData, setConsistencyData] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkDataConsistency();
  }, []);

  const checkDataConsistency = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/maintenance/consistency-report');
      setConsistencyData(response.data);
      setLastChecked(new Date().toLocaleString());
    } catch (error) {
      console.error('Error checking data consistency:', error);
      setError('Failed to check data consistency');
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async (dryRun = true) => {
    setCleanupLoading(true);
    setError('');
    setCleanupResult(null);
    
    try {
      const response = await api.post('/maintenance/cleanup-orphaned', { dryRun });
      setCleanupResult(response.data);
      
      // Refresh consistency data after cleanup
      if (!dryRun) {
        await checkDataConsistency();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      setError('Failed to perform cleanup operation');
    } finally {
      setCleanupLoading(false);
    }
  };

  const getStatusBadge = (isConsistent, totalOrphaned) => {
    if (isConsistent) {
      return <Badge className="bg-green-100 text-green-800">✅ Consistent</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">❌ {totalOrphaned} Issues</Badge>;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-600" />
                Data Maintenance
              </h1>
              <p className="text-gray-600">Maintain data consistency and clean up orphaned records</p>
            </div>
          </div>
          
          <Button
            onClick={checkDataConsistency}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Check
          </Button>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Data Consistency Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Data Consistency Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Checking data consistency...</span>
              </div>
            ) : consistencyData ? (
              <div className="space-y-6">
                {/* Status Overview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold">Database Status:</div>
                    {getStatusBadge(consistencyData.isConsistent, consistencyData.totalOrphaned)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Last checked: {lastChecked}
                  </div>
                </div>

                {/* Detailed Breakdown */}
                {!consistencyData.isConsistent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="text-2xl font-bold text-orange-700">
                        {formatNumber(consistencyData.totals.submissionsOrphaned)}
                      </div>
                      <div className="text-sm text-orange-600">Orphaned Submissions</div>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-700">
                        {formatNumber(consistencyData.totals.internalMarksOrphaned)}
                      </div>
                      <div className="text-sm text-red-600">Orphaned Internal Marks</div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-700">
                        {formatNumber(consistencyData.totals.testsOrphaned)}
                      </div>
                      <div className="text-sm text-purple-600">Orphaned Tests</div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-700">
                        {formatNumber(consistencyData.totals.studentsOrphaned)}
                      </div>
                      <div className="text-sm text-blue-600">Orphaned Students</div>
                    </div>
                  </div>
                )}

                {consistencyData.isConsistent && (
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <div className="text-lg font-semibold text-green-800">
                      Database is Consistent!
                    </div>
                    <div className="text-green-600">
                      No orphaned records found. All data relationships are intact.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Click "Refresh Check" to analyze data consistency
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cleanup Actions */}
        {consistencyData && !consistencyData.isConsistent && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Cleanup Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-amber-800">
                    <strong>Warning:</strong> Cleanup operations will permanently delete orphaned records. 
                    Always run a dry-run first to preview what will be deleted.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => performCleanup(true)}
                    disabled={cleanupLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Preview Cleanup (Dry Run)
                  </Button>
                  
                  <Button
                    onClick={() => performCleanup(false)}
                    disabled={cleanupLoading}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {cleanupLoading ? 'Cleaning...' : 'Execute Cleanup'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cleanup Results */}
        {cleanupResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Cleanup Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={cleanupResult.dryRun ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                    {cleanupResult.dryRun ? "DRY RUN" : "EXECUTED"}
                  </Badge>
                  <span className="text-sm text-gray-600">{cleanupResult.message}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-lg">{cleanupResult.cleanupSummary.submissionsDeleted}</div>
                    <div className="text-sm text-gray-600">Submissions</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-lg">{cleanupResult.cleanupSummary.internalMarksDeleted}</div>
                    <div className="text-sm text-gray-600">Internal Marks</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-lg">{cleanupResult.cleanupSummary.testsDeleted}</div>
                    <div className="text-sm text-gray-600">Tests</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-bold text-lg">{cleanupResult.cleanupSummary.studentsDeleted}</div>
                    <div className="text-sm text-gray-600">Students</div>
                  </div>
                </div>

                {!cleanupResult.dryRun && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-green-800">
                      Cleanup completed successfully. Database consistency has been restored.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              About Data Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Data Consistency:</strong> Ensures all database references are valid and no orphaned records exist.
              </p>
              <p>
                <strong>Orphaned Records:</strong> Records that reference deleted entities (e.g., submissions for deleted students or tests).
              </p>
              <p>
                <strong>Automated Cleanup:</strong> When entities are deleted through the admin interface, all related records are automatically removed.
              </p>
              <p>
                <strong>Manual Cleanup:</strong> Use this tool to clean up any orphaned records that may exist from data imported from external sources.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataMaintenance;
