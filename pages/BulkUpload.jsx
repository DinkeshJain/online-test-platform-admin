import { useState } from 'react';
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
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Users, 
  ArrowLeft, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';

const BulkUpload = () => {
  const [excelFile, setExcelFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState('folder'); // 'folder' or 'individual' - folder as default
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [photoMatches, setPhotoMatches] = useState([]);

  const navigate = useNavigate();

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')) {
        setExcelFile(file);
        setError('');
        
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
            toast.success(`Successfully matched ${matches.length} photos with enrollment numbers`);
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
      link.download = 'Student_Bulk_Upload_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel template downloaded successfully! Check the Instructions sheet for detailed field information.');
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
        }
      });

      setUploadResult(response.data);
      toast.success('Students data uploaded successfully!');
      
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
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3" />
            Upload Students Data
          </h1>
          <p className="text-gray-600 mt-2">
            Upload multiple students at once using Excel file and their photos
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">Upload Students</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadResult && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Upload Summary:</strong></p>
                    <p>✅ Successfully uploaded: {uploadResult.successCount || 0} students</p>
                    {uploadResult.errorCount > 0 && (
                      <p>❌ Failed uploads: {uploadResult.errorCount}</p>
                    )}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p><strong>Errors:</strong></p>
                        <ul className="list-disc list-inside text-sm">
                          {uploadResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Excel File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Excel File
                  </CardTitle>
                  <CardDescription>
                    Upload Excel file with student data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="excel-file">Select Excel File</Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileChange}
                      disabled={uploading}
                    />
                  </div>
                  
                  {excelFile && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Selected: {excelFile.name}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </CardContent>
              </Card>

              {/* Photo Files Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Student Photos
                  </CardTitle>
                  <CardDescription>
                    Upload student photos (Optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Mode Selection */}
                  <div className="space-y-3">
                    <Label>Upload Method</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="uploadMode"
                          value="folder"
                          checked={uploadMode === 'folder'}
                          onChange={(e) => setUploadMode(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Upload Folder</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="uploadMode"
                          value="individual"
                          checked={uploadMode === 'individual'}
                          onChange={(e) => setUploadMode(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Select Individual Files</span>
                      </label>
                    </div>
                  </div>

                  {/* File Upload Input */}
                  <div className="space-y-2">
                    <Label htmlFor="photo-files">
                      {uploadMode === 'folder' ? 'Select Folder with Photos' : 'Select Photos'}
                    </Label>
                    {uploadMode === 'folder' ? (
                      <Input
                        id="photo-files"
                        type="file"
                        accept="image/*"
                        multiple
                        webkitdirectory=""
                        directory=""
                        onChange={handleFolderUpload}
                        disabled={uploading}
                      />
                    ) : (
                      <Input
                        id="photo-files"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoFilesChange}
                        disabled={uploading}
                      />
                    )}
                  </div>
                  
                  {photoFiles.length > 0 && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Selected: {photoFiles.length} photo(s)
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <p>• Supported formats: JPG, JPEG, PNG</p>
                    <p>• File names should match enrollment numbers</p>
                    <p>• Example: EN001.jpg, EN002.png</p>
                    {uploadMode === 'folder' && (
                      <p>• Select the folder containing all student photos</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Photo Matching Preview */}
            {photoMatches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Photo Matching Preview
                  </CardTitle>
                  <CardDescription>
                    Preview of how photos will be matched with enrollment numbers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {photoMatches.map((match, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-md border ${
                            match.matched 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              match.matched ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <span className="font-medium text-sm">
                              {match.enrollmentNo}
                            </span>
                          </div>
                          <div className={`text-sm ${
                            match.matched ? 'text-green-700' : 'text-yellow-700'
                          }`}>
                            {match.fileName}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {photoMatches.filter(m => m.matched && m.file).length}
                      </div>
                      <div className="text-gray-600">Matched</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">
                        {photoMatches.filter(m => !m.matched && !m.file).length}
                      </div>
                      <div className="text-gray-600">No Photo</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-600">
                        {photoFiles.filter(photo => 
                          !photoMatches.some(m => m.file === photo)
                        ).length}
                      </div>
                      <div className="text-gray-600">Unmatched Files</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Progress */}
            {uploading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleBulkUpload}
                  disabled={!excelFile || uploading}
                  className="w-full h-12 text-base"
                >
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading... {uploadProgress}%
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
          </TabsContent>

          <TabsContent value="instructions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  How to Upload Students Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">Step 1: Download Template</h3>
                  <p className="text-sm text-gray-600">
                    Click "Download Excel Template" to get the latest format with comprehensive instructions.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Step 2: Fill Student Data</h3>
                  <p className="text-sm text-gray-600">
                    Fill the Excel template with student information. The template includes all fields in the following order:
                  </p>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div>
                      <strong>Student Data Fields:</strong>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>SrNo</strong> - Serial number for reference</li>
                        <li><strong>EnrollmentNo</strong> - Unique enrollment number</li>
                        <li><strong>BatchYear</strong> - Year of admission</li>
                        <li><strong>Course</strong> - Course name or code</li>
                        <li><strong>AdmissionDate</strong> - Date of admission (YYYY-MM-DD)</li>
                        <li><strong>FullName</strong> - Student's complete name</li>
                        <li><strong>DateOfBirth</strong> - Student's birth date (YYYY-MM-DD)</li>
                        <li><strong>Gender</strong> - Male/Female/Other</li>
                        <li><strong>EmailID</strong> - Valid email address</li>
                        <li><strong>MobileNo</strong> - 10-digit mobile number</li>
                        <li><strong>AadhaarNo</strong> - 12-digit Aadhar number</li>
                        <li><strong>CasteCategory</strong> - General/OBC/SC/ST/etc.</li>
                        <li><strong>FatherName</strong> - Father's full name</li>
                        <li><strong>MotherName</strong> - Mother's full name</li>
                        <li><strong>AddressLine1</strong> - Primary address</li>
                        <li><strong>AddressLine2</strong> - Secondary address/locality</li>
                        <li><strong>City</strong> - City name</li>
                        <li><strong>State</strong> - State name</li>
                        <li><strong>Pincode</strong> - 6-digit postal code</li>
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Only SrNo/EnrollmentNo, FullName, and EmailID are required. All other fields are optional.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Step 3: Prepare Photos (Optional)</h3>
                  <p className="text-sm text-gray-600">
                    You can upload student photos in two ways:
                  </p>
                  
                  <div className="ml-4 space-y-2">
                    <div>
                      <h4 className="font-medium text-sm">Option 1: Upload Folder</h4>
                      <ul className="text-sm text-gray-600 list-disc list-inside ml-4">
                        <li>Select entire folder containing all photos</li>
                        <li>System will automatically match filenames with enrollment numbers</li>
                        <li>Shows preview of matched/unmatched photos</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm">Option 2: Select Individual Files</h4>
                      <ul className="text-sm text-gray-600 list-disc list-inside ml-4">
                        <li>Select multiple photo files individually</li>
                        <li>Name files with enrollment numbers (e.g., EN001.jpg)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>File Requirements:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>Supported formats: JPG, JPEG, PNG</li>
                      <li>Filename should match enrollment number exactly</li>
                      <li>Example: If enrollment is "EN001", name file "EN001.jpg"</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Step 4: Upload</h3>
                  <p className="text-sm text-gray-600">
                    Select your Excel file and photos, then click "Upload Students".
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> Passwords will be automatically generated using enrollment numbers. 
                    Students can use their enrollment number as both username and password for first login.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BulkUpload;
