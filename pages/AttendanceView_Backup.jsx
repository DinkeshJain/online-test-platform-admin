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
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // New status filter
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(20);
  const [counts, setCounts] = useState({ finished: 0, started: 0, absent: 0 });
  const [courseInfo, setCourseInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedCourse !== 'null') {
      fetchAttendanceData();
    } else {
      // Reset data when no course is selected
      setAttendanceData([]);
      setFilteredAttendanceData([]);
      setSubjects([]);
      setCounts({ finished: 0, started: 0, absent: 0 });
      setCourseInfo(null);
    }
  }, [selectedCourse, selectedSubject]); // Add selectedSubject to dependencies

  useEffect(() => {
    filterData();
  }, [attendanceData, searchTerm, selectedSubject, selectedStatus]); // Add selectedStatus

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchAttendanceData = async () => {
    if (!selectedCourse || selectedCourse === 'null' || selectedCourse === '') {
      return;
    }
    setLoading(true);
    try {
      // Pass selected subject as query parameter for enhanced data
      const queryParam = selectedSubject !== 'all' ? `subject=${selectedSubject}` : '';
      const response = await api.get(`/submissions/attendance/${selectedCourse}${queryParam ? `?${queryParam}` : ''}`);
      if (!response || !response.data) {
        throw new Error('No data received from server');
      }
      const data = response.data;
      
      setAttendanceData(data.attendanceData || []);
      setSubjects(data.subjects || []);
      setCounts(data.counts || { finished: 0, started: 0, absent: 0 });
      setCourseInfo(data.course);

      // Reset pagination and search when changing filters
      setCurrentPage(1);
      setSearchTerm('');
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
      setAttendanceData([]);
      setSubjects([]);
      setCounts({ finished: 0, started: 0, absent: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = attendanceData;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(studentData =>
        studentData.student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentData.student.enrollmentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(studentData => {
        if (selectedSubject === 'all') {
          // Check if any subject has the selected status
          return Object.values(studentData.testStatuses).some(testStatus => 
            testStatus.status === selectedStatus
          );
        } else {
          // Check specific subject status
          const testStatus = studentData.testStatuses[selectedSubject];
          return testStatus && testStatus.status === selectedStatus;
        }
      });
    }

    setFilteredAttendanceData(filtered);
    setCurrentPage(1);

    // Recalculate counts for filtered data
    if (selectedSubject === 'all' && selectedStatus === 'all') {
      // Use original counts when showing all subjects and all statuses
      const originalCounts = { finished: 0, started: 0, absent: 0 };
      filtered.forEach(studentData => {
        Object.values(studentData.testStatuses).forEach(testStatus => {
          if (testStatus.status === 'Finished') originalCounts.finished++;
          else if (testStatus.status === 'Started') originalCounts.started++;
          else originalCounts.absent++;
        });
      });
      setCounts(originalCounts);
    } else if (selectedSubject !== 'all') {
      // Calculate counts for selected subject only
      const subjectCounts = { finished: 0, started: 0, absent: 0 };
      filtered.forEach(studentData => {
        const testStatus = studentData.testStatuses[selectedSubject];
        if (testStatus) {
          if (testStatus.status === 'Finished') subjectCounts.finished++;
          else if (testStatus.status === 'Started') subjectCounts.started++;
          else subjectCounts.absent++;
        }
      });
      setCounts(subjectCounts);
    } else {
      // Calculate counts with status filter applied
      const statusCounts = { finished: 0, started: 0, absent: 0 };
      filtered.forEach(studentData => {
        Object.values(studentData.testStatuses).forEach(testStatus => {
          if (testStatus.status === 'Finished') statusCounts.finished++;
          else if (testStatus.status === 'Started') statusCounts.started++;
          else statusCounts.absent++;
        });
      });
      setCounts(statusCounts);
    }
  };

  const handleDeleteSubmission = async (submissionId, studentName, subjectCode) => {
    try {
      await api.delete(`/submissions/${submissionId}`);
      toast.success(`Deleted submission for ${studentName} in ${subjectCode}`);
      fetchAttendanceData();
    } catch (error) {
      console.error('Error deleting submission:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete submission';
      toast.error(errorMessage);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Finished':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Finished
          </Badge>
        );
      case 'Started':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Started
          </Badge>
        );
      case 'Absent':
      default:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Absent
          </Badge>
        );
    }
  };

  // Pagination logic
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredAttendanceData.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredAttendanceData.length / studentsPerPage);

  // Determine which subjects to display in table
  const displaySubjects = selectedSubject === 'all' ? subjects : subjects.filter(s => s.code === selectedSubject);
  
  // Check if detailed view should be shown (when specific subject is selected)
  const showDetailedView = selectedSubject !== 'all';

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
                Monitor student participation and test completion status
              </p>
            </div>
          </div>
        </div>

        {/* Improved Filter Section with better layout */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Course Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Course</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.courseCode} - {course.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                  disabled={!selectedCourse}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.code} value={subject.code}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Finished">Finished</SelectItem>
                    <SelectItem value="Started">Started</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name or enrollment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={!selectedCourse}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedCourse ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Select a Course
              </h3>
              <p className="text-gray-500">
                Choose a course from the dropdown to view student attendance data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Finished {selectedSubject !== 'all' && `(${selectedSubject})`}
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
                        Started {selectedSubject !== 'all' && `(${selectedSubject})`}
                      </p>
                      <p className="text-3xl font-bold text-yellow-600">{counts.started}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Absent {selectedSubject !== 'all' && `(${selectedSubject})`}
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
                  <p className="text-sm text-gray-600">
                    Showing {filteredAttendanceData.length} students 
                    {selectedSubject !== 'all' && ` for ${selectedSubject}`}
                    {selectedStatus !== 'all' && ` with status: ${selectedStatus}`}
                  </p>
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
                    {attendanceData.length === 0 
                      ? "No students or tests found for the selected course." 
                      : "No students match the current search criteria."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    {showDetailedView ? (
                      /* Detailed View for Specific Subject */
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-4 font-semibold text-gray-900">Enrollment No.</th>
                            <th className="text-left p-4 font-semibold text-gray-900">Student Name</th>
                            <th className="text-left p-4 font-semibold text-gray-900">Status</th>
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
                          {currentStudents.map((studentData, index) => {
                            const testStatus = studentData.testStatuses[selectedSubject];
                            const detailedInfo = testStatus?.detailedInfo;
                            
                            return (
                              <tr key={studentData.student._id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{studentData.student.enrollmentNumber}</td>
                                <td className="p-4">{studentData.student.name}</td>
                                <td className="p-4">{getStatusBadge(testStatus?.status || 'Absent')}</td>
                                <td className="p-4">
                                  {detailedInfo ? (
                                    <div className="flex items-center gap-1">
                                      <Target className="w-4 h-4 text-blue-600" />
                                      {detailedInfo.questionsAttempted}/70
                                    </div>
                                  ) : 'N/A'}
                                </td>
                                <td className="p-4">
                                  {detailedInfo ? (
                                    <div className="flex items-center gap-1">
                                      <Trophy className="w-4 h-4 text-yellow-600" />
                                      {detailedInfo.score}/70
                                    </div>
                                  ) : 'N/A'}
                                </td>
                                <td className="p-4 text-sm">
                                  {detailedInfo?.testStartedAt || 'N/A'}
                                </td>
                                <td className="p-4 text-sm">
                                  {detailedInfo?.lastSavedAt || 'N/A'}
                                </td>
                                <td className="p-4 text-sm">
                                  {detailedInfo?.submittedAt || 'N/A'}
                                </td>
                                <td className="p-4">
                                  {detailedInfo ? Math.round(detailedInfo.timeSpent / 60) : 'N/A'}
                                </td>
                                <td className="p-4">
                                  {testStatus?.status === 'Finished' && testStatus.submissionId && (
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
                                            Are you sure you want to delete the submission for {studentData.student.name} 
                                            in {selectedSubject}? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteSubmission(
                                              testStatus.submissionId,
                                              studentData.student.name,
                                              selectedSubject
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
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      /* Overview Table for All Subjects */
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-4 font-semibold text-gray-900">Enrollment No.</th>
                            <th className="text-left p-4 font-semibold text-gray-900">Student Name</th>
                            {displaySubjects.map((subject) => (
                              <th key={subject.code} className="text-center p-4 font-semibold text-gray-900">
                                {subject.code}<br />
                                <span className="text-xs font-normal text-gray-600">{subject.name}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentStudents.map((studentData, index) => (
                            <tr key={studentData.student._id} className="border-b hover:bg-gray-50">
                              <td className="p-4">{studentData.student.enrollmentNumber}</td>
                              <td className="p-4">{studentData.student.name}</td>
                              {displaySubjects.map((subject) => (
                                <td key={subject.code} className="p-4 text-center">
                                  {studentData.testStatuses[subject.code] ? (
                                    <>
                                      {getStatusBadge(studentData.testStatuses[subject.code].status)}
                                      {studentData.testStatuses[subject.code].status === 'Finished' && 
                                       studentData.testStatuses[subject.code].submissionId && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="ml-1 text-red-600 hover:text-red-700">
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete the submission for {studentData.student.name} 
                                                in {subject.code}? This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteSubmission(
                                                  studentData.testStatuses[subject.code].submissionId,
                                                  studentData.student.name,
                                                  subject.code
                                                )}
                                                className="bg-red-600 hover:bg-red-700"
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </>
                                  ) : (
                                    getStatusBadge('Absent')
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <div className="text-sm text-gray-700">
                        Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredAttendanceData.length)} of {filteredAttendanceData.length} students
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
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
                                onClick={() => setCurrentPage(pageNum)}
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
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
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