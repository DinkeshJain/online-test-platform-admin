import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { ArrowLeft, Search, Filter, ClipboardList, Loader2, Trash2, CheckCircle, Clock, XCircle, Eye, Calendar, Target, Trophy } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import { DateUtils } from '../lib/dateUtils';

const AttendanceView = () => {
  // Date and Test Type states
  const [submissionDates, setSubmissionDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [testTypes, setTestTypes] = useState([]);
  const [selectedTestType, setSelectedTestType] = useState('');

  // Data states
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [counts, setCounts] = useState({ finished: 0, started: 0, absent: 0 });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(50); // Updated to 50 as requested
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalStudents: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  const navigate = useNavigate();

  // Fetch submission dates on component mount
  useEffect(() => {
    fetchSubmissionDates();
  }, []);

  // Fetch test types when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchTestTypes();
    } else {
      setTestTypes([]);
      setSelectedTestType('');
    }
  }, [selectedDate]);

  // Fetch data when both date and testType are selected
  useEffect(() => {
    if (selectedDate && selectedTestType) {
      setCurrentPage(1);
      fetchAttendanceData(1);
    } else {
      // Reset data when prerequisites are not met
      resetData();
    }
  }, [selectedDate, selectedTestType, selectedCourse, selectedStatus]);

  // Handle search with debouncing
  useEffect(() => {
    if (!selectedDate || !selectedTestType) return;
    
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchAttendanceData(1, searchTerm);
      } else {
        fetchAttendanceData(currentPage);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Client-side filtering for current page data
  useEffect(() => {
    setFilteredAttendanceData(attendanceData);
  }, [attendanceData]);

  const resetData = () => {
    setAttendanceData([]);
    setFilteredAttendanceData([]);
    setCourses([]);
    setSubjects([]);
    setCounts({ finished: 0, started: 0, absent: 0 });
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalStudents: 0,
      hasNextPage: false,
      hasPrevPage: false
    });
  };

  const fetchSubmissionDates = async () => {
    try {
      const response = await api.get('/submissions/attendance/dates');
      setSubmissionDates(response.data.dates || []);
    } catch (error) {
      console.error('Error fetching submission dates:', error);
      toast.error('Failed to load submission dates');
    }
  };

  const fetchTestTypes = async () => {
    try {
      const response = await api.get(`/submissions/attendance/test-types/${selectedDate}`);
      setTestTypes(response.data.testTypes || []);
    } catch (error) {
      console.error('Error fetching test types:', error);
      toast.error('Failed to load test types');
    }
  };

  const fetchAttendanceData = async (page = currentPage, search = '') => {
    if (!selectedDate || !selectedTestType) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔄 Fetching attendance data:', { 
        date: selectedDate, 
        testType: selectedTestType, 
        page, 
        selectedCourse, 
        selectedStatus,
        search 
      });
      
      // Build query parameters
      const params = new URLSearchParams({
        date: selectedDate,
        testType: selectedTestType,
        page: page.toString(),
        limit: studentsPerPage.toString()
      });
      
      if (selectedCourse && selectedCourse !== 'all') {
        params.append('course', selectedCourse);
      }
      
      if (selectedStatus && selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await api.get(`/submissions/attendance/data?${params}`);
      if (!response || !response.data) {
        throw new Error('No data received from server');
      }
      
      const data = response.data;
      console.log('📊 Received data:', {
        studentsCount: data.attendanceData?.length,
        pagination: data.pagination,
        totalStudents: data.pagination?.totalStudents
      });
      
      setAttendanceData(data.attendanceData || []);
      setCourses(data.courses || []);
      setSubjects(data.subjects || []);
      setCounts(data.counts || { finished: 0, started: 0, absent: 0 });
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalStudents: 0,
        hasNextPage: false,
        hasPrevPage: false
      });
      setCurrentPage(page);

      // Reset search when changing filters (but not when actively searching)
      if (page === 1 && !search) {
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
      resetData();
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
      fetchAttendanceData(newPage, searchTerm);
    }
  };

  const handleDeleteSubmission = async (submissionId, studentName, subjectCode) => {
    try {
      await api.delete(`/submissions/${submissionId}`);
      toast.success(`Deleted submission for ${studentName} in ${subjectCode}`);
      // Refresh current page data
      fetchAttendanceData(currentPage, searchTerm);
    } catch (error) {
      console.error('Error deleting submission:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete submission';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (hasSubmissions) => {
    if (hasSubmissions) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Finished
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Absent
        </Badge>
      );
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Use server pagination info
  const currentStudents = filteredAttendanceData;
  const totalPages = pagination.totalPages;
  const indexOfFirstStudent = (pagination.currentPage - 1) * studentsPerPage;
  const indexOfLastStudent = Math.min(indexOfFirstStudent + studentsPerPage, pagination.totalStudents);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Attendance View</h1>
              <p className="text-gray-600 mt-1">
                Monitor student participation and test completion status by exam date
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-step Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Select Exam Details
            </CardTitle>
            <CardDescription>
              Follow the steps: 1) Select exam date → 2) Select test type → 3) Apply additional filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Step 1: Date Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  1. Exam Date
                </label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {submissionDates.map((dateInfo) => (
                      <SelectItem key={dateInfo.date} value={dateInfo.date}>
                        {formatDate(dateInfo.date)} ({dateInfo.count} submissions)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Test Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  2. Test Type
                </label>
                <Select 
                  value={selectedTestType} 
                  onValueChange={setSelectedTestType}
                  disabled={!selectedDate}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Test Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((typeInfo) => (
                      <SelectItem key={typeInfo.testType} value={typeInfo.testType}>
                        {typeInfo.testType.charAt(0).toUpperCase() + typeInfo.testType.slice(1)} ({typeInfo.count} submissions)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 3: Course Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">3. Course (Optional)</label>
                <Select 
                  value={selectedCourse} 
                  onValueChange={setSelectedCourse}
                  disabled={!selectedDate || !selectedTestType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.courseCode} value={course.courseCode}>
                        {course.courseCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 4: Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">4. Status (Optional)</label>
                <Select 
                  value={selectedStatus} 
                  onValueChange={setSelectedStatus}
                  disabled={!selectedDate || !selectedTestType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Finished">Finished</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 5: Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">5. Search (Optional)</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name or enrollment..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                    disabled={!selectedDate || !selectedTestType}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedDate || !selectedTestType ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Select Exam Date and Test Type
              </h3>
              <p className="text-gray-500">
                Please select both an exam date and test type to view attendance data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Students Finished
                      </p>
                      <p className="text-3xl font-bold text-green-600">{counts.finished}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Students Absent
                      </p>
                      <p className="text-3xl font-bold text-red-600">{counts.absent}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Info */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm text-gray-600">
                      Showing {filteredAttendanceData.length} students for <strong>{selectedTestType}</strong> exam on <strong>{formatDate(selectedDate)}</strong>
                      {selectedCourse && selectedCourse !== 'all' && ` from course ${selectedCourse}`}
                      {selectedStatus !== 'all' && ` with status: ${selectedStatus}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Page {pagination.currentPage} of {pagination.totalPages} • Total: {pagination.totalStudents} students
                    </p>
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-500">Loading...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading attendance data...</p>
                </CardContent>
              </Card>
            ) : filteredAttendanceData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No Data Found
                  </h3>
                  <p className="text-gray-500">
                    No students match the current search criteria for this exam.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-4 font-semibold text-gray-900">Enrollment No.</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Student Name</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Course</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Subject</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Test Type</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Questions Attempted</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Score</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Test Started</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Last Saved</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Submitted</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Time Spent (min)</th>
                          <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStudents.map((submissionData, index) => (
                          <tr key={`${submissionData.student._id}-${submissionData.subject?.code || index}`} className="border-b hover:bg-gray-50">
                            <td className="p-4">{submissionData.student.enrollmentNumber}</td>
                            <td className="p-4">{submissionData.student.name}</td>
                            <td className="p-4">{submissionData.student.course}</td>
                            <td className="p-4">
                              {submissionData.subject ? (
                                <Badge variant="outline">{submissionData.subject.code}</Badge>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary">{submissionData.testType || selectedTestType}</Badge>
                            </td>
                            <td className="p-4">
                              {submissionData.submission ? (
                                <div className="flex items-center gap-1">
                                  <Target className="w-4 h-4 text-blue-600" />
                                  {submissionData.submission.answeredQuestions || 'N/A'}/{submissionData.submission.totalQuestions || 'N/A'}
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td className="p-4">
                              {submissionData.submission ? (
                                <div className="flex items-center gap-1">
                                  <Trophy className="w-4 h-4 text-yellow-600" />
                                  {submissionData.submission.score || 0}/{submissionData.submission.totalQuestions || 'N/A'}
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td className="p-4 text-sm">
                              {submissionData.submission?.testStartedAt ? 
                                new Date(submissionData.submission.testStartedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="p-4 text-sm">
                              {submissionData.submission?.lastSavedAt ? 
                                new Date(submissionData.submission.lastSavedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="p-4 text-sm">
                              {submissionData.submission?.submittedAt ? 
                                new Date(submissionData.submission.submittedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="p-4">
                              {submissionData.submission?.timeSpent ? 
                                Math.round(submissionData.submission.timeSpent / 60) : 'N/A'}
                            </td>
                            <td className="p-4">
                              {submissionData.submission?._id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the submission for {submissionData.student.name} 
                                        in {submissionData.subject?.code || 'this test'}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteSubmission(
                                          submissionData.submission._id,
                                          submissionData.student.name,
                                          submissionData.subject?.code || 'test'
                                        )}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <div className="text-sm text-gray-700">
                        Showing {indexOfFirstStudent + 1} to {indexOfLastStudent} of {pagination.totalStudents} students
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!pagination.hasPrevPage || loading}
                        >
                          Previous
                        </Button>
                        
                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                          const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + index;
                          if (pageNum <= totalPages) {
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                disabled={loading}
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                          return null;
                        })}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!pagination.hasNextPage || loading}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceView;