import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Plus, Edit, Trash2, Users, FileText, BookOpen } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import BackendStatusIndicator from '../components/BackendStatusIndicator';
import DataConsistencyIndicator from '../components/DataConsistencyIndicator';

const AdminDashboard = () => {
  const [tests, setTests] = useState([]);
  const [totalTestCount, setTotalTestCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTestType, setSelectedTestType] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  // Reset selected subject when course changes or when subjects list changes
  useEffect(() => {
    const availableSubjects = getUniqueSubjects();
    if (selectedSubject !== 'all' && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject('all');
    }
  }, [selectedCourse, tests]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');      
      if (!token) {
        console.error('❌ No authentication token found!');
        toast.error('Please log in to access admin dashboard');
        return;
      }
      
      const [testsResponse, coursesResponse] = await Promise.all([
        (async () => {
          try {
            const response = await api.get('/tests/admin?limit=100');
            return response;
          } catch (error) {
            console.error('❌ Tests API failed:', error);
            console.error('❌ Error details:', {
              message: error.message,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              config: error.config
            });
            return { data: { tests: [] } };
          }
        })(),
        api.get('/courses').catch((error) => {
          console.error('Courses API error:', error);
          return { data: { courses: [] } };
        }) // Fallback for courses
      ]);
      
      setTests(testsResponse.data.tests || []);
      setTotalTestCount(testsResponse.data.pagination?.total || testsResponse.data.tests?.length || 0);
      setCourses(coursesResponse.data.courses || []);
      setCourseCount(coursesResponse.data.courses?.length || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTest = (testId) => {
    navigate(`/edit-test/${testId}`);
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      try {
        await api.delete(`/tests/${testId}`);
        setTests(tests.filter(test => test._id !== testId));
        toast.success('Test deleted successfully');
      } catch (error) {
        console.error('Error deleting test:', error);
        toast.error('Failed to delete test');
      }
    }
  };

  const toggleTestStatus = async (testId, currentStatus) => {
    try {
      const response = await api.put(`/tests/${testId}`, { isActive: !currentStatus });
      
      setTests(tests.map(test => 
        test._id === testId ? { ...test, isActive: !currentStatus } : test
      ));
      toast.success(`Test ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling test status:', error);
      toast.error('Failed to update test status');
    }
  };

  // Get unique subjects from tests, filtered by selected course
  const getUniqueSubjects = () => {
    // Filter tests by selected course first
    const filteredTests = selectedCourse === 'all' 
      ? tests 
      : tests.filter(test => test.courseCode === selectedCourse);
    
    // Extract unique subjects from filtered tests
    const subjects = [...new Set(filteredTests.map(test => `${test.subject?.subjectCode}-${test.subject?.subjectName}`))];
    return subjects.filter(subject => subject !== 'undefined-undefined');
  };

  // Generate display title from subject info
  const getDisplayTitle = (test) => {
    if (test.subject && test.subject.subjectCode && test.subject.subjectName) {
      const lastDigit = test.subject.subjectCode.slice(-1);
      return `${test.subject.subjectCode}: ${test.subject.subjectName} (Paper ${lastDigit})`;
    }
    return 'Untitled Test';
  };

  // Check if test is currently active based on time
  const isTestCurrentlyActive = (test) => {
    // First check if the test is marked as active
    if (!test.isActive) {
      return false;
    }
    
    // If no time restrictions are set, just use the isActive flag
    if (!test.activeFrom || !test.activeTo) {
      return test.isActive;
    }
    
    const now = new Date();
    const activeFrom = new Date(test.activeFrom);
    const activeTo = new Date(test.activeTo);
    
    // Check if current time is within the active period
    return test.isActive && now >= activeFrom && now <= activeTo;
  };

  // Get status text and color for a test (shows admin toggle status + time-based status)
  const getTestStatus = (test) => {
    if (!test.isActive) {
      return { text: 'Inactive (Admin)', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    }
    
    if (!test.activeFrom || !test.activeTo) {
      return { text: 'Active', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
    
    const now = new Date();
    const activeFrom = new Date(test.activeFrom);
    const activeTo = new Date(test.activeTo);
    
    if (now < activeFrom) {
      return { text: 'Active (Scheduled)', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    } else if (now > activeTo) {
      return { text: 'Active (Expired)', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else {
      return { text: 'Active (Live)', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
  };

  const getFilteredTests = () => {
    return tests.filter(test => {
      const courseMatch = selectedCourse === 'all' || test.courseCode === selectedCourse;
      const subjectMatch = selectedSubject === 'all' || 
        `${test.subject?.subjectCode}-${test.subject?.subjectName}` === selectedSubject;
      const testTypeMatch = selectedTestType === 'all' || test.testType === selectedTestType;
      return courseMatch && subjectMatch && testTypeMatch;
    });
  };

  if (loading) {
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
      
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-3">
                  <span className="text-gray-800">Acharya Nagarjuna University</span>
                  <br className="sm:hidden" />
                  <span className="text-gray-600 text-lg sm:text-xl lg:text-2xl"> in technical collaboration with </span>
                  <br className="sm:hidden" />
                  <span className="text-gray-800">National Institute of Fire and Safety</span>
                  <br />
                  <span className="text-gray-600 text-base sm:text-lg lg:text-xl font-medium">Online Examination Portal</span>
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">Administrative Dashboard - Manage tests and monitor activity</p>
                
                {/* Backend Status Indicator */}
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <BackendStatusIndicator />
                  <DataConsistencyIndicator />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/reports')}
                  className="w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button 
                  onClick={() => navigate('/create-test')}
                  className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 mb-8 md:grid-cols-2">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTestCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{courseCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tests Management */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Manage Tests</h2>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="min-w-[180px]">
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedSubject('all'); // Reset subject when course changes
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => {
                    return (
                      <option key={course._id} value={course.courseCode}>
                        {course.courseCode} - {course.courseName}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="min-w-[180px]">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={selectedCourse !== 'all' && getUniqueSubjects().length === 0}
                >
                  <option value="all">
                    {selectedCourse !== 'all' && getUniqueSubjects().length === 0 
                      ? 'No subjects available for this course'
                      : 'All Subjects'
                    }
                  </option>
                  {getUniqueSubjects().map(subject => {
                    const [subjectCode, subjectName] = subject.split('-');
                    return (
                      <option key={subject} value={subject}>
                        {subjectCode} - {subjectName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="min-w-[160px]">
                <select
                  value={selectedTestType}
                  onChange={(e) => setSelectedTestType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Test Types</option>
                  <option value="official">Official Exams</option>
                  <option value="demo">Demo Exams</option>
                </select>
              </div>
            </div>
          </div>

          {getFilteredTests().length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {tests.length === 0 ? 'No tests created' : 'No tests match your filters'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {tests.length === 0 
                    ? 'Get started by creating your first test.'
                    : 'Try adjusting your course, subject, or test type filters.'
                  }
                </p>
                {tests.length === 0 && (
                  <Button className="mt-4" onClick={() => navigate('/create-test')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Test
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getFilteredTests().map((test) => (
                <Card key={test._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium">{getDisplayTitle(test)}</h3>
                          {(() => {
                            const status = getTestStatus(test);
                            return (
                              <Badge className={`${status.color} ${status.bgColor} ${status.borderColor} border`}>
                                {status.text}
                              </Badge>
                            );
                          })()}
                        </div>
                        
                        {/* Course and Subject Info */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {test.courseCode && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {test.courseCode}
                            </Badge>
                          )}
                          <Badge 
                            variant={test.testType === 'demo' ? 'secondary' : 'default'} 
                            className={test.testType === 'demo' ? 'text-orange-600 border-orange-600' : 'text-green-600 border-green-600'}
                          >
                            {test.testType === 'demo' ? 'Demo Exam' : 'Official Exam'}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>{test.duration} minutes</span>
                          <span>{test.questions.length} questions</span>
                          {test.activeFrom && test.activeTo && (
                            <div className="text-xs text-gray-600">
                              <div>Start: {new Date(test.activeFrom).toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}</div>
                              <div>End: {new Date(test.activeTo).toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 lg:flex-col xl:flex-row">
                        <div className="flex items-center space-x-2 mb-2 lg:mb-0 xl:mb-2">
                          <Switch
                            checked={test.isActive}
                            onCheckedChange={() => toggleTestStatus(test._id, test.isActive)}
                          />
                          <span className="text-sm">Active</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTest(test._id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTest(test._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;