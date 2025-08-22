import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Trash2, ArrowLeft, Save, Edit, Upload, FileSpreadsheet } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';

const CreateTest = () => {
  const { testId } = useParams();
  const isEditing = !!testId;

  const [testData, setTestData] = useState({
    duration: 180,
    course: '',
    subject: {
      subjectCode: '',
      subjectName: ''
    },
    activeFrom: '',
    activeTo: '',
    shuffleQuestions: true,
    shuffleOptions: true,
    testType: 'official',
    isActive: true,
    showScoresToStudents: false,
    questions: [
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      }
    ]
  });
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [excelFile, setExcelFile] = useState(null);
  const [excelImportData, setExcelImportData] = useState({
    duration: 180,
    course: '',
    subject: {
      subjectCode: '',
      subjectName: ''
    },
    activeFrom: '',
    activeTo: '',
    shuffleQuestions: true,
    shuffleOptions: true,
    testType: 'official',
    isActive: true,
    showScoresToStudents: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    if (isEditing) {
      fetchTestForEdit();
    }
  }, [testId, isEditing]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses);
    } catch (error) {
      // Don't show error toast for courses as it's optional
    }
  };

  const fetchTestForEdit = async () => {
    try {
      const response = await api.get(`/tests/${testId}/edit`);
      const test = response.data.test;

      setTestData({
        duration: test.duration,
        course: test.course?._id || '',
        subject: {
          subjectCode: test.subject?.subjectCode || '',
          subjectName: test.subject?.subjectName || ''
        },
        activeFrom: test.activeFrom ?
          new Date(new Date(test.activeFrom).getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16) : '',
        activeTo: test.activeTo ?
          new Date(new Date(test.activeTo).getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16) : '',
        shuffleQuestions: test.shuffleQuestions !== undefined ? test.shuffleQuestions : true,
        shuffleOptions: test.shuffleOptions !== undefined ? test.shuffleOptions : true,
        testType: test.testType || 'official',
        isActive: test.isActive !== undefined ? test.isActive : true,
        showScoresToStudents: test.showScoresToStudents !== undefined ? test.showScoresToStudents : false,
        questions: test.questions.map(q => ({
          question: q.question,
          options: [...q.options],
          correctAnswer: q.correctAnswer
        }))
      });
    } catch (error) {
      console.error('Error fetching test for edit:', error);
      toast.error('Failed to load test for editing');
      navigate('/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleTestDataChange = (field, value) => {
    let updatedData = {
      ...testData,
      [field]: value
    };

    // Reset subject when course changes
    if (field === 'course') {
      updatedData.subject = {
        subjectCode: '',
        subjectName: ''
      };
    }

    setTestData(updatedData);
  };

  const getSelectedCourseSubjects = (courseId, isExcelForm = false) => {
    const selectedCourse = courses.find(course => course._id === courseId);
    if (!selectedCourse) return [];

    // Only return subjects that have external exams, since tests are only for subjects with external exams
    return selectedCourse.subjects.filter(subject => subject.hasExternalExam !== false);
  };

  const handleSubjectChange = (subjectCode, subjectName, isExcelForm = false) => {
    const subjectData = {
      subjectCode,
      subjectName
    };

    if (isExcelForm) {
      setExcelImportData({
        ...excelImportData,
        subject: subjectData
      });
    } else {
      setTestData({
        ...testData,
        subject: subjectData
      });
    }
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    const updatedQuestions = [...testData.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      [field]: value
    };
    setTestData({
      ...testData,
      questions: updatedQuestions
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...testData.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setTestData({
      ...testData,
      questions: updatedQuestions
    });
  };

  const addQuestion = () => {
    setTestData({
      ...testData,
      questions: [
        ...testData.questions,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        }
      ]
    });
  };

  const removeQuestion = (questionIndex) => {
    if (testData.questions.length > 1) {
      const updatedQuestions = testData.questions.filter((_, index) => index !== questionIndex);
      setTestData({
        ...testData,
        questions: updatedQuestions
      });
    }
  };

  const validateForm = () => {
    if (testData.duration < 1) {
      setError('Duration must be at least 1 minute');
      return false;
    }

    if (!testData.course) {
      setError('Course selection is required');
      return false;
    }

    if (!testData.subject.subjectCode || !testData.subject.subjectName) {
      setError('Subject selection is required');
      return false;
    }

    for (let i = 0; i < testData.questions.length; i++) {
      const question = testData.questions[i];

      if (!question.question.trim()) {
        setError(`Question ${i + 1} is required`);
        return false;
      }

      for (let j = 0; j < question.options.length; j++) {
        if (!question.options[j].trim()) {
          setError(`All options for question ${i + 1} are required`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Prepare data with proper date formatting
      const submitData = {
        ...testData,
        // Convert datetime-local strings to proper ISO dates
        activeFrom: testData.activeFrom ? new Date(testData.activeFrom).toISOString() : null,
        activeTo: testData.activeTo ? new Date(testData.activeTo).toISOString() : null
      };

      if (isEditing) {
        await api.put(`/tests/${testId}`, submitData);
        toast.success('Test updated successfully!');
      } else {
        await api.post('/tests', submitData);
        toast.success('Test created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving test:', error);
      const errorMessage = error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} test`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExcelFile(file);
    }
  };

  const handleExcelImportDataChange = (field, value) => {
    let updatedData = {
      ...excelImportData,
      [field]: value
    };

    // Reset subject when course changes
    if (field === 'course') {
      updatedData.subject = {
        subjectCode: '',
        subjectName: ''
      };
    }

    setExcelImportData(updatedData);
  };

  const handleExcelImport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!excelFile) {
      setError('Please select an Excel file');
      setLoading(false);
      return;
    }

    if (!excelImportData.duration) {
      setError('Duration is required');
      setLoading(false);
      return;
    }

    if (!excelImportData.course) {
      setError('Course selection is required');
      setLoading(false);
      return;
    }

    if (!excelImportData.subject.subjectCode || !excelImportData.subject.subjectName) {
      setError('Subject selection is required');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('excelFile', excelFile);
      formData.append('duration', excelImportData.duration);
      formData.append('course', excelImportData.course);
      formData.append('subject', JSON.stringify(excelImportData.subject));
      formData.append('testType', excelImportData.testType);
      formData.append('activeFrom', excelImportData.activeFrom);
      formData.append('activeTo', excelImportData.activeTo);
      formData.append('shuffleQuestions', excelImportData.shuffleQuestions);
      formData.append('shuffleOptions', excelImportData.shuffleOptions);
      formData.append('isActive', excelImportData.isActive);
      formData.append('showScoresToStudents', excelImportData.showScoresToStudents);

      const response = await api.post('/tests/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(response.data.message);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error importing Excel:', error);
      const errorMessage = error.response?.data?.message || 'Failed to import Excel file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}+05:30`;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="mb-4 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Panel
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            {isEditing ? (
              <>
                Edit Test
              </>
            ) : (
              <>
                Create New Test
              </>
            )}
          </h1>
        </div>

        {!isEditing ? (
          <Tabs defaultValue="excel" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-0 h-auto sm:h-10">
              <TabsTrigger value="excel" className="text-sm">Excel Import</TabsTrigger>
              <TabsTrigger value="manual" className="text-sm">Manual Creation</TabsTrigger>
            </TabsList>

            <TabsContent value="excel" className="space-y-6">
              {/* Excel Import Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Import Test from Excel
                  </CardTitle>
                  <CardDescription>
                    Upload an Excel file with questions and options. Headers should be in row 4: Sl No, QUESTION, Right Option, Option 2, Option 3, Option 4. Data starts from row 5.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleExcelImport} className="space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="excel-duration">Duration (minutes) *</Label>
                        <Input
                          id="excel-duration"
                          type="number"
                          min="1"
                          value={excelImportData.duration}
                          onChange={(e) => handleExcelImportDataChange('duration', parseInt(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="excel-testType">Test Type *</Label>
                        <select
                          id="excel-testType"
                          value={excelImportData.testType}
                          onChange={(e) => handleExcelImportDataChange('testType', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="official">Official Exam</option>
                          <option value="demo">Demo Exam (Optional)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excel-course">Course *</Label>
                      <select
                        id="excel-course"
                        value={excelImportData.course}
                        onChange={(e) => handleExcelImportDataChange('course', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.courseCode} - {course.courseName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excel-subject">Subject *</Label>
                      <select
                        id="excel-subject"
                        value={excelImportData.subject.subjectCode}
                        onChange={(e) => {
                          const selectedSubject = getSelectedCourseSubjects(excelImportData.course).find(
                            sub => sub.subjectCode === e.target.value
                          );
                          if (selectedSubject) {
                            handleSubjectChange(selectedSubject.subjectCode, selectedSubject.subjectName, true);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!excelImportData.course}
                        required
                      >
                        <option value="">Select a subject</option>
                        {getSelectedCourseSubjects(excelImportData.course).map((subject) => (
                          <option key={subject.subjectCode} value={subject.subjectCode}>
                            {subject.subjectCode} - {subject.subjectName}
                          </option>
                        ))}
                      </select>
                      {!excelImportData.course && (
                        <p className="text-sm text-gray-500">Please select a course first</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="excel-active-from" className="text-sm font-medium text-gray-700">
                          Active From <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-1">(IST)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="excel-active-from"
                            type="datetime-local"
                            value={excelImportData.activeFrom}
                            onChange={(e) => {
                              handleExcelImportDataChange('activeFrom', e.target.value);
                              // Auto-validate that activeFrom is before activeTo
                              if (excelImportData.activeTo && e.target.value >= excelImportData.activeTo) {
                                toast.error('Start date must be before end date');
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            min={new Date().toISOString().slice(0, 16)}
                            required
                          />
                          {excelImportData.activeFrom && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {excelImportData.activeFrom && (
                          <p className="text-xs text-gray-500">
                            {new Date(excelImportData.activeFrom).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="excel-active-to" className="text-sm font-medium text-gray-700">
                          Active To <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-1">(IST)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="excel-active-to"
                            type="datetime-local"
                            value={excelImportData.activeTo}
                            onChange={(e) => {
                              handleExcelImportDataChange('activeTo', e.target.value);
                              // Auto-validate that activeTo is after activeFrom
                              if (excelImportData.activeFrom && e.target.value <= excelImportData.activeFrom) {
                                toast.error('End date must be after start date');
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            min={excelImportData.activeFrom || new Date().toISOString().slice(0, 16)}
                            required
                          />
                          {excelImportData.activeTo && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {excelImportData.activeTo && (
                          <p className="text-xs text-gray-500">
                            {new Date(excelImportData.activeTo).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        )}
                      </div>

                      {/* Duration Display */}
                      {excelImportData.activeFrom && excelImportData.activeTo && (
                        <div className="md:col-span-2 mt-2">
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-blue-800">Test Duration:</span>
                              <span className="text-blue-600">
                                {(() => {
                                  const start = new Date(excelImportData.activeFrom);
                                  const end = new Date(excelImportData.activeTo);
                                  const diffMs = end - start;
                                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                  if (diffMs <= 0) return "Invalid duration";

                                  let duration = "";
                                  if (diffDays > 0) duration += `${diffDays} day${diffDays > 1 ? 's' : ''} `;
                                  if (diffHours > 0) duration += `${diffHours} hour${diffHours > 1 ? 's' : ''} `;
                                  if (diffMinutes > 0) duration += `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;

                                  return duration || "Less than a minute";
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="excel-shuffle-questions"
                          checked={excelImportData.shuffleQuestions}
                          onCheckedChange={(checked) => handleExcelImportDataChange('shuffleQuestions', checked)}
                        />
                        <Label htmlFor="excel-shuffle-questions">Shuffle Questions</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="excel-shuffle-options"
                          checked={excelImportData.shuffleOptions}
                          onCheckedChange={(checked) => handleExcelImportDataChange('shuffleOptions', checked)}
                        />
                        <Label htmlFor="excel-shuffle-options">Shuffle Options</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="excel-is-active"
                          checked={excelImportData.isActive}
                          onCheckedChange={(checked) => handleExcelImportDataChange('isActive', checked)}
                        />
                        <Label htmlFor="excel-is-active">Test Active</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="excel-show-scores"
                          checked={excelImportData.showScoresToStudents}
                          onCheckedChange={(checked) => handleExcelImportDataChange('showScoresToStudents', checked)}
                        />
                        <Label htmlFor="excel-show-scores">Show Scores to Students</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excel-file">Excel File *</Label>
                      <Input
                        id="excel-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelFileChange}
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Upload an Excel file (.xlsx or .xls) with headers in row 4: Sl No, QUESTION, Right Option, Option 2, Option 3, Option 4. Data starts from row 5.
                      </p>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import Test from Excel
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              {/* Manual Test Creation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Test Manually</CardTitle>
                  <CardDescription>
                    Create a test by adding questions one by one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes) *</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={testData.duration}
                          onChange={(e) => handleTestDataChange('duration', parseInt(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testType">Test Type *</Label>
                        <select
                          id="testType"
                          value={testData.testType}
                          onChange={(e) => handleTestDataChange('testType', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="official">Official Exam</option>
                          <option value="demo">Demo Exam (Optional)</option>
                        </select>
                        <p className="text-sm text-gray-500">
                          {testData.testType === 'demo'
                            ? 'Demo exams are optional practice tests for students'
                            : 'Official exams are mandatory for all students'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="course">Course *</Label>
                      <select
                        id="course"
                        value={testData.course}
                        onChange={(e) => handleTestDataChange('course', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.courseCode} - {course.courseName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <select
                        id="subject"
                        value={testData.subject.subjectCode}
                        onChange={(e) => {
                          const selectedSubject = getSelectedCourseSubjects(testData.course).find(
                            sub => sub.subjectCode === e.target.value
                          );
                          if (selectedSubject) {
                            handleSubjectChange(selectedSubject.subjectCode, selectedSubject.subjectName);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!testData.course}
                        required
                      >
                        <option value="">Select a subject</option>
                        {getSelectedCourseSubjects(testData.course).map((subject) => (
                          <option key={subject.subjectCode} value={subject.subjectCode}>
                            {subject.subjectCode} - {subject.subjectName}
                          </option>
                        ))}
                      </select>
                      {!testData.course && (
                        <p className="text-sm text-gray-500">Please select a course first</p>
                      )}
                      {testData.course && getSelectedCourseSubjects(testData.course).length === 0 && (
                        <p className="text-sm text-amber-600">
                          No subjects with external exams found in this course. Tests can only be created for subjects with external exams.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="active-from" className="text-sm font-medium text-gray-700">
                          Active From <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-1">(IST)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="active-from"
                            type="datetime-local"
                            value={testData.activeFrom}
                            onChange={(e) => {
                              handleTestDataChange('activeFrom', e.target.value);
                              // Auto-validate that activeFrom is before activeTo
                              if (testData.activeTo && e.target.value >= testData.activeTo) {
                                toast.error('Start date must be before end date');
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            min={new Date().toISOString().slice(0, 16)}
                            required
                          />
                          {testData.activeFrom && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {testData.activeFrom && (
                          <p className="text-xs text-gray-500">
                            {new Date(testData.activeFrom).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="active-to" className="text-sm font-medium text-gray-700">
                          Active To <span className="text-red-500">*</span>
                          <span className="text-xs text-gray-500 ml-1">(IST)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="active-to"
                            type="datetime-local"
                            value={testData.activeTo}
                            onChange={(e) => {
                              handleTestDataChange('activeTo', e.target.value);
                              // Auto-validate that activeTo is after activeFrom
                              if (testData.activeFrom && e.target.value <= testData.activeFrom) {
                                toast.error('End date must be after start date');
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            min={testData.activeFrom || new Date().toISOString().slice(0, 16)}
                            required
                          />
                          {testData.activeTo && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {testData.activeTo && (
                          <p className="text-xs text-gray-500">
                            {new Date(testData.activeTo).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        )}
                      </div>

                      {/* Duration Display */}
                      {testData.activeFrom && testData.activeTo && (
                        <div className="lg:col-span-2 mt-2">
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                              <span className="font-medium text-blue-800">Test Duration:</span>
                              <span className="text-blue-600">
                                {(() => {
                                  const start = new Date(testData.activeFrom);
                                  const end = new Date(testData.activeTo);
                                  const diffMs = end - start;
                                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                  if (diffMs <= 0) return "Invalid duration";

                                  let duration = "";
                                  if (diffDays > 0) duration += `${diffDays} day${diffDays > 1 ? 's' : ''} `;
                                  if (diffHours > 0) duration += `${diffHours} hour${diffHours > 1 ? 's' : ''} `;
                                  if (diffMinutes > 0) duration += `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;

                                  return duration || "Less than a minute";
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="shuffle-questions"
                          checked={testData.shuffleQuestions}
                          onCheckedChange={(checked) => handleTestDataChange('shuffleQuestions', checked)}
                        />
                        <Label htmlFor="shuffle-questions" className="text-sm">Shuffle Questions</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="shuffle-options"
                          checked={testData.shuffleOptions}
                          onCheckedChange={(checked) => handleTestDataChange('shuffleOptions', checked)}
                        />
                        <Label htmlFor="shuffle-options" className="text-sm">Shuffle Options</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-active"
                          checked={testData.isActive}
                          onCheckedChange={(checked) => handleTestDataChange('isActive', checked)}
                        />
                        <Label htmlFor="is-active" className="text-sm">Test Active</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-scores"
                          checked={testData.showScoresToStudents}
                          onCheckedChange={(checked) => handleTestDataChange('showScoresToStudents', checked)}
                        />
                        <Label htmlFor="show-scores" className="text-sm">Show Scores to Students</Label>
                      </div>
                    </div>

                    {/* Questions Section */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <Label className="text-lg font-semibold">Questions</Label>
                        <Button
                          type="button"
                          onClick={addQuestion}
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>

                      {testData.questions.map((question, questionIndex) => (
                        <Card key={questionIndex} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
                              {testData.questions.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeQuestion(questionIndex)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor={`question-${questionIndex}`}>Question Text *</Label>
                              <Textarea
                                id={`question-${questionIndex}`}
                                value={question.question}
                                onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                                placeholder="Enter your question"
                                required
                                rows={2}
                              />
                            </div>

                            <div className="space-y-3">
                              <Label>Options *</Label>
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                  <div className="flex items-center space-x-2 sm:space-x-0">
                                    <input
                                      type="radio"
                                      id={`correct-${questionIndex}-${optionIndex}`}
                                      name={`correct-${questionIndex}`}
                                      checked={question.correctAnswer === optionIndex}
                                      onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
                                      className="mt-1"
                                    />
                                    <span className="text-sm text-gray-600 sm:hidden">Option {optionIndex + 1}:</span>
                                  </div>
                                  <div className="flex-1">
                                    <Input
                                      type="text"
                                      value={option}
                                      onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                                      placeholder={`Option ${optionIndex + 1}`}
                                      required
                                    />
                                  </div>
                                </div>
                              ))}
                              <p className="text-sm text-gray-500 mt-2">
                                Select the radio button next to the correct answer
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Test...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Create Test
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Edit Test Form */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                Edit Test
              </CardTitle>
              <CardDescription>
                Update the existing test details and questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {initialLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading test data...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="edit-duration">Duration (minutes) *</Label>
                      <Input
                        id="edit-duration"
                        type="number"
                        min="1"
                        value={testData.duration}
                        onChange={(e) => handleTestDataChange('duration', parseInt(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-course">Course *</Label>
                    <select
                      id="edit-course"
                      value={testData.course}
                      onChange={(e) => handleTestDataChange('course', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.courseCode} - {course.courseName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-subject">Subject *</Label>
                    <select
                      id="edit-subject"
                      value={testData.subject.subjectCode}
                      onChange={(e) => {
                        const selectedSubject = getSelectedCourseSubjects(testData.course).find(
                          sub => sub.subjectCode === e.target.value
                        );
                        if (selectedSubject) {
                          handleSubjectChange(selectedSubject.subjectCode, selectedSubject.subjectName);
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!testData.course}
                      required
                    >
                      <option value="">Select a subject</option>
                      {getSelectedCourseSubjects(testData.course).map((subject) => (
                        <option key={subject.subjectCode} value={subject.subjectCode}>
                          {subject.subjectCode} - {subject.subjectName}
                        </option>
                      ))}
                    </select>
                    {!testData.course && (
                      <p className="text-sm text-gray-500">Please select a course first</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="edit-active-from" className="text-sm font-medium text-gray-700">
                        Active From <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-500 ml-1">(IST)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="edit-active-from"
                          type="datetime-local"
                          value={testData.activeFrom}
                          onChange={(e) => {
                            handleTestDataChange('activeFrom', e.target.value);
                            // Auto-validate that activeFrom is before activeTo
                            if (testData.activeTo && e.target.value >= testData.activeTo) {
                              toast.error('Start date must be before end date');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          min={new Date().toISOString().slice(0, 16)}
                          required
                        />
                        {testData.activeFrom && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      {testData.activeFrom && (
                        <p className="text-xs text-gray-500">
                          {new Date(testData.activeFrom).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-active-to" className="text-sm font-medium text-gray-700">
                        Active To <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-500 ml-1">(IST)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="edit-active-to"
                          type="datetime-local"
                          value={testData.activeTo}
                          onChange={(e) => {
                            handleTestDataChange('activeTo', e.target.value);
                            // Auto-validate that activeTo is after activeFrom
                            if (testData.activeFrom && e.target.value <= testData.activeFrom) {
                              toast.error('End date must be after start date');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          min={testData.activeFrom || new Date().toISOString().slice(0, 16)}
                          required
                        />
                        {testData.activeTo && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      {testData.activeTo && (
                        <p className="text-xs text-gray-500">
                          {new Date(testData.activeTo).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      )}
                    </div>

                    {/* Duration Display */}
                    {testData.activeFrom && testData.activeTo && (
                      <div className="md:col-span-2 mt-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-blue-800">Test Duration:</span>
                            <span className="text-blue-600">
                              {(() => {
                                const start = new Date(testData.activeFrom);
                                const end = new Date(testData.activeTo);
                                const diffMs = end - start;
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                if (diffMs <= 0) return "Invalid duration";

                                let duration = "";
                                if (diffDays > 0) duration += `${diffDays} day${diffDays > 1 ? 's' : ''} `;
                                if (diffHours > 0) duration += `${diffHours} hour${diffHours > 1 ? 's' : ''} `;
                                if (diffMinutes > 0) duration += `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;

                                return duration || "Less than a minute";
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-shuffle-questions"
                        checked={testData.shuffleQuestions}
                        onCheckedChange={(checked) => handleTestDataChange('shuffleQuestions', checked)}
                      />
                      <Label htmlFor="edit-shuffle-questions">Shuffle Questions</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-shuffle-options"
                        checked={testData.shuffleOptions}
                        onCheckedChange={(checked) => handleTestDataChange('shuffleOptions', checked)}
                      />
                      <Label htmlFor="edit-shuffle-options">Shuffle Options</Label>
                    </div>

                  </div>

                  {/* Questions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Questions</Label>
                      <Button
                        type="button"
                        onClick={addQuestion}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>

                    {testData.questions.map((question, questionIndex) => (
                      <Card key={questionIndex} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
                            {testData.questions.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeQuestion(questionIndex)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`edit-question-${questionIndex}`}>Question Text *</Label>
                            <Textarea
                              id={`edit-question-${questionIndex}`}
                              value={question.question}
                              onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                              placeholder="Enter your question"
                              required
                              rows={2}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Options *</Label>
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  id={`edit-correct-${questionIndex}-${optionIndex}`}
                                  name={`edit-correct-${questionIndex}`}
                                  checked={question.correctAnswer === optionIndex}
                                  onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <Input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                                    placeholder={`Option ${optionIndex + 1}`}
                                    required
                                  />
                                </div>
                              </div>
                            ))}
                            <p className="text-sm text-gray-500 mt-2">
                              Select the radio button next to the correct answer
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating Test...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Test
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateTest;