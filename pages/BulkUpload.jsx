import { useState, useEffect } from 'react'; // FIXED: Import useEffect
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, FileSpreadsheet, Download, Users, ArrowLeft, CheckCircle, AlertTriangle, Info, Clock, Database } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';

const BulkUpload = () => {
  const [excelFile, setExcelFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState('folder');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [photoMatches, setPhotoMatches] = useState([]);
  const [processingStatus, setProcessingStatus] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);
  
  const navigate = useNavigate();

  // FIXED: Changed from useState(() => {...}) to useEffect(() => {...}, [])
  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      const response = await api.get('/bulk/students/template');
      if (response.data.availableCourses) {
        setAvailableCourses(response.data.availableCourses);
      }
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' || 
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')) {
        setExcelFile(file);
        setError('');
        setUploadResult(null);
        
        // If we have photos, try to match them
        if (photoFiles.length > 0) {
          matchPhotosWithEnrollment(photoFiles);
        }
      } else {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setExcelFile(null);
      }
    }
  };

  const handlePhotoFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && 
      (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png'))
    );
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only JPG, JPEG, and PNG images are allowed.');
    }
    
    setPhotoFiles(validFiles);
    
    // If we have both excel file and photos, try to match them
    if (excelFile && validFiles.length > 0) {
      matchPhotosWithEnrollment(validFiles);
    }
  };

  const handleFolderUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && 
      (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png'))
    );
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only JPG, JPEG, and PNG images are allowed.');
    }
    
    setPhotoFiles(validFiles);
    
    // If we have both excel file and photos, try to match them
    if (excelFile && validFiles.length > 0) {
      matchPhotosWithEnrollment(validFiles);
    }
  };

  const matchPhotosWithEnrollment = async (photoFiles) => {
    if (!excelFile) return;

    try {
      // Read Excel file directly in the browser
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          
          // For now, let's create a simple fallback that extracts enrollment from filenames
          // and matches them with photo filenames
          const enrollmentNumbers = [];
          
          // Extract enrollment numbers from photo filenames as a fallback
          photoFiles.forEach(photo => {
            const fileName = photo.name.replace(/\.(jpg|jpeg|png)$/i, '');
            if (fileName && fileName.trim()) {
              enrollmentNumbers.push(fileName.trim());
            }
          });

          // Create matches based on available photos
          const matches = [];
          const processedEnrollments = new Set();
          
          photoFiles.forEach(photo => {
            const fileName = photo.name.replace(/\.(jpg|jpeg|png)$/i, '');
            const enrollmentNo = fileName.trim();
            
            if (enrollmentNo && !processedEnrollments.has(enrollmentNo)) {
              matches.push({
                enrollmentNo: enrollmentNo,
                fileName: photo.name,
                file: photo,
                matched: true
              });
              processedEnrollments.add(enrollmentNo);
            }
          });

          setPhotoMatches(matches);
          
          if (matches.length > 0) {
            toast.success(`Successfully matched ${ matches.length } photos with enrollment numbers`);
          }
        } catch (parseError) {
          console.error('Error processing Excel file:', parseError);
          
          // Fallback: Create matches based on photo filenames only
          const matches = photoFiles.map(photo => {
            const fileName = photo.name.replace(/\.(jpg|jpeg|png)$/i, '');
            return {
              enrollmentNo: fileName.trim(),
              fileName: photo.name,
              file: photo,
              matched: true
            };
          });
          
          setPhotoMatches(matches);
          toast.info('Using photo filenames as enrollment numbers. Please verify the matches.');
        }
      };

      fileReader.onerror = () => {
        console.error('Error reading Excel file');
        toast.error('Failed to read Excel file');
      };

      fileReader.readAsArrayBuffer(excelFile);
    } catch (error) {
      console.error('Error matching photos:', error);
      
      // Ultimate fallback: Just create matches based on photo filenames
      const matches = photoFiles.map(photo => {
        const fileName = photo.name.replace(/\.(jpg|jpeg|png)$/i, '');
        return {
          enrollmentNo: fileName.trim(),
          fileName: photo.name,
          file: photo,
          matched: true
        };
      });
      
      setPhotoMatches(matches);
      toast.warning('Could not read Excel file. Using photo filenames as enrollment numbers.');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/bulk/students/download-template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Student_Bulk_Upload_Template_v2.2.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel template downloaded successfully! Check the Available Courses and Instructions sheets.');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template. Please try again.');
    }
  };

  const handleBulkUpload = async () => {
    if (!excelFile) {
      setError('Please select an Excel file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);
    setProcessingProgress(0);
    setCurrentBatch(0);
    setTotalBatches(0);
    setProcessingStatus('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('excel', excelFile);

      // Add matched photo files with their enrollment numbers
      if (photoMatches.length > 0) {
        photoMatches.forEach((match) => {
          if (match.file && match.matched) {
            // Append the file with enrollment number as identifier
            formData.append('photos', match.file);
            formData.append('photoEnrollments', match.enrollmentNo);
          }
        });
      } else if (photoFiles.length > 0) {
        // Fallback: Add photos without specific enrollment mapping
        photoFiles.forEach((photo) => {
          formData.append('photos', photo);
          // Extract enrollment from filename
          const enrollmentFromFilename = photo.name.replace(/\.(jpg|jpeg|png)$/i, '');
          formData.append('photoEnrollments', enrollmentFromFilename);
        });
      }

      const response = await api.post('/bulk/students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
          
          if (percentCompleted === 100) {
            setProcessingStatus('Processing students in batches...');
          }
        }
      });

      // Handle the response with batch processing info
      const result = response.data;
      setUploadResult(result);

      // Update final processing status
      if (result.summary) {
        setTotalBatches(result.summary.totalBatches || 0);
        setCurrentBatch(result.summary.batchesProcessed || 0);
        setProcessingProgress(100);
        setProcessingStatus(`Processing completed! ${ result.summary.batchesProcessed } batches processed.`);
      }

      // Show appropriate success message
      if (result.failureCount > 0) {
        toast.success(`Upload completed with some issues.${ result.successCount } successful, ${ result.failureCount } failed.`);
      } else {
        toast.success(`All students uploaded successfully! ${ result.successCount } students processed.`);
      }

      // Reset form
      setExcelFile(null);
      setPhotoFiles([]);
      setPhotoMatches([]);
      
      // Reset file inputs
      const excelInput = document.getElementById('excel-file');
      const photoInput = document.getElementById('photo-files');
      if (excelInput) excelInput.value = '';
      if (photoInput) photoInput.value = '';

    } catch (error) {
      console.error('Error uploading:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload students';
      setError(errorMessage);
      setProcessingStatus('Upload failed');
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/students')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Students</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Student Data
                </CardTitle>
                <CardDescription>
                  Upload multiple students at once using Excel file and their photos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Excel File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="excel-file" className="text-sm font-medium">
                    Excel File *
                  </Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelFileChange}
                    className="cursor-pointer"
                  />
                  {excelFile && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      ✓ Selected: {excelFile.name}
                    </p>
                  )}
                </div>

                {/* Photo Upload */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Student Photos (Optional)
                  </Label>
                  
                  <Tabs value={uploadMode} onValueChange={setUploadMode}>
                    <TabsList>
                      <TabsTrigger value="folder">Folder Upload</TabsTrigger>
                      <TabsTrigger value="multiple">Multiple Files</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="folder" className="space-y-2">
                      <Input
                        type="file"
                        webkitdirectory=""
                        multiple
                        accept="image/*"
                        onChange={handleFolderUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500">
                        • Select the folder containing all student photos
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="multiple" className="space-y-2">
                      <Input
                        id="photo-files"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoFilesChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500">
                        • Select multiple photo files
                      </p>
                    </TabsContent>
                  </Tabs>

                  {photoFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        ✓ {photoFiles.length} photo(s) selected
                      </p>
                      {photoMatches.length > 0 && (
                        <p className="text-sm text-blue-600">
                          {photoMatches.length} photos matched with enrollment numbers
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">File Upload Progress</span>
                        <span className="text-sm text-gray-500">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                    
                    {processingProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Processing Progress</span>
                          <span className="text-sm text-gray-500">{processingProgress}%</span>
                        </div>
                        <Progress value={processingProgress} className="w-full" />
                      </div>
                    )}
                    
                    <p className="text-sm text-blue-600 flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      {processingStatus}
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={handleBulkUpload}
                  disabled={!excelFile || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Students
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Template Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Download Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Download the Excel template with proper formatting and sample data.
                </p>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            {/* Upload Results */}
            {uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Upload Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResult.successCount}
                      </div>
                      <div className="text-sm text-green-600">Successful</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {uploadResult.failureCount}
                      </div>
                      <div className="text-sm text-red-600">Failed</div>
                    </div>
                  </div>
                  
                  {uploadResult.results?.failed && uploadResult.results.failed.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Failed Records:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {uploadResult.results.failed.slice(0, 5).map((failure, index) => (
                          <div key={index} className="text-xs p-2 bg-red-50 rounded">
                            <p className="font-medium">{failure.error}</p>
                            {failure.suggestion && (
                              <p className="text-gray-600 mt-1">{failure.suggestion}</p>
                            )}
                          </div>
                        ))}
                        {uploadResult.results.failed.length > 5 && (
                          <p className="text-xs text-gray-500">
                            ... and {uploadResult.results.failed.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="space-y-2">
                  <p className="font-medium">📄 Excel File Requirements:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Use the provided template format</li>
                    <li>EnrollmentNo, FullName, EmailID are required</li>
                    <li>Course field should contain valid course codes</li>
                    <li>Gender should be MALE/FEMALE/Other</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">📸 Photo Requirements:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Photo filename should match EnrollmentNo</li>
                    <li>Supported formats: JPG, JPEG, PNG</li>
                    <li>Maximum 5MB per photo</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
// ```

// ## ** Key Changes:**
//   1. ** Hook Fix **: Changed `useState(() => { ... })` to`useEffect(() => { ... }, [])`
// 2. ** Import Fix **: Added `useEffect` to the imports
// 3. ** Proper Hook Usage **: Now correctly uses `useEffect` for side effects during component mount
// 4. ** Maintained Functionality **: All other features remain exactly the same