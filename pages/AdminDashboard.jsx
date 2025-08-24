import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Plus, Edit, Trash2, Users, FileText, EyeOff, BookOpen, CheckCircle, AlertCircle, Download, Eye, FileDown } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import BackendStatusIndicator from '../components/BackendStatusIndicator';
import DataConsistencyIndicator from '../components/DataConsistencyIndicator';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AdminDashboard = () => {
  const [tests, setTests] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTestType, setSelectedTestType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' or 'results'
  const [courseResults, setCourseResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState(null);
  const [reports, setReports] = useState([]);
  const resultsPreviewRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch reports when results tab is active
  useEffect(() => {
    if (activeTab === 'results') {
      fetchCourseResults();
      fetchReportsForPreview();
    }
  }, [activeTab]);

  // Reset selected subject when course changes or when subjects list changes
  useEffect(() => {
    const availableSubjects = getUniqueSubjects();
    if (selectedSubject !== 'all' && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject('all');
    }
  }, [selectedCourse, tests]);

  const fetchData = async () => {
    try {
      console.log('🔄 Starting fetchData...');
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('🔑 Auth token:', token ? `Present (${token.substring(0, 20)}...)` : 'Missing');
      console.log('👤 User data:', user ? JSON.parse(user) : 'Missing');
      
      if (!token) {
        console.error('❌ No authentication token found!');
        toast.error('Please log in to access admin dashboard');
        return;
      }
      
      const [testsResponse, studentsResponse, coursesResponse] = await Promise.all([
        (async () => {
          try {
            console.log('🚀 Making request to /tests/admin...');
            const response = await api.get('/tests/admin');
            console.log('✅ Tests API success:', response);
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
        api.get('/bulk/students/count').catch(() => ({ data: { count: 0 } })), // Fallback if endpoint doesn't exist yet
        api.get('/courses').catch((error) => {
          console.error('Courses API error:', error);
          return { data: { courses: [] } };
        }) // Fallback for courses
      ]);
      
      console.log('🔍 Raw API responses:');
      console.log('Tests response:', testsResponse);
      console.log('Students response:', studentsResponse);
      console.log('Courses response:', coursesResponse);
      
      console.log('API Responses:', {
        tests: testsResponse?.data?.tests?.length || 0,
        students: studentsResponse?.data?.count || 0,
        courses: coursesResponse?.data?.courses?.length || 0
      });
      
      setTests(testsResponse.data.tests || []);
      setStudentCount(studentsResponse.data.count || 0);
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

  // Filter tests based on selected course and subject
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

  // Fetch course results
  const fetchCourseResults = async () => {
    setLoadingResults(true);
    try {
      const response = await api.get('/submissions/course-results');
      setCourseResults(response.data.courseResults);
    } catch (error) {
      console.error('Error fetching course results:', error);
      toast.error('Failed to load course results');
    } finally {
      setLoadingResults(false);
    }
  };

  // Check if all internal marks are complete for a course
  const areAllInternalMarksComplete = (courseResult) => {
    if (!courseResult.students || courseResult.students.length === 0) return false;
    
    return courseResult.students.every(student => 
      courseResult.subjects.every(subject => {
        const subjectResult = student.subjectResults.find(sr => sr.subjectCode === subject.subjectCode);
        return subjectResult && subjectResult.internalMarks !== null;
      })
    );
  };

  // Release results for a course
  const releaseResults = async (courseId) => {
    if (window.confirm('Are you sure you want to release results for this course? Students will be able to view their results.')) {
      try {
        await api.post(`/submissions/release-results/${courseId}`);
        toast.success('Results released successfully');
        fetchCourseResults();
      } catch (error) {
        console.error('Error releasing results:', error);
        toast.error('Failed to release results');
      }
    }
  };

  // Fetch reports for results preview
  const fetchReportsForPreview = async () => {
    try {
      const response = await api.get('/submissions/reports/course-subject');
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports for preview');
    }
  };

  // Helper function to calculate grade and points
  const calculateGradeAndPoints = (totalMarks, externalMarks, maxExternalMarks, isAbsent = false) => {
    if (isAbsent) {
      return { gradePoints: 0, grade: 'W' };
    }
    
    const externalPercentage = maxExternalMarks > 0 ? (externalMarks / maxExternalMarks) * 100 : 0;
    const hasMinimumExternal = externalPercentage >= 35;
    
    if (!hasMinimumExternal) {
      return { gradePoints: '-', grade: 'F' };
    }
    
    if (totalMarks >= 90) {
      return { gradePoints: 10, grade: 'O' };
    } else if (totalMarks >= 80) {
      return { gradePoints: 9, grade: 'A' };
    } else if (totalMarks >= 70) {
      return { gradePoints: 8, grade: 'B' };
    } else if (totalMarks >= 60) {
      return { gradePoints: 7, grade: 'C' };
    } else if (totalMarks >= 50) {
      return { gradePoints: 6, grade: 'D' };
    } else if (totalMarks >= 40) {
      return { gradePoints: 5, grade: 'E' };
    } else {
      return { gradePoints: '-', grade: 'F' };
    }
  };

  // Generate student result data for preview - course-wise with all subjects
  const generateStudentResults = (reports) => {
    const courseGroups = {};
    const reportsArray = Array.isArray(reports) ? reports : [reports];
    
    reportsArray.forEach(report => {
      const courseKey = `${report.course.courseCode}-${report.course.courseName}`;
      if (!courseGroups[courseKey]) {
        courseGroups[courseKey] = {
          course: report.course,
          subjects: [],
          studentResultsMap: {}
        };
      }
      
      courseGroups[courseKey].subjects.push({
        subject: report.subject,
        tests: report.tests,
        studentResults: report.studentResults
      });
      
      report.studentResults.forEach(studentResult => {
        const studentKey = studentResult.student.enrollmentNo;
        if (!courseGroups[courseKey].studentResultsMap[studentKey]) {
          courseGroups[courseKey].studentResultsMap[studentKey] = {
            student: studentResult.student,
            subjectResults: []
          };
        }
        
        courseGroups[courseKey].studentResultsMap[studentKey].subjectResults.push({
          subject: report.subject,
          tests: report.tests,
          testResults: studentResult.testResults
        });
      });
    });

    const results = [];
    
    Object.values(courseGroups).forEach(courseGroup => {
      Object.values(courseGroup.studentResultsMap).forEach(studentData => {
        const studentResult = {
          enrollmentNo: studentData.student.enrollmentNo,
          fullName: studentData.student.fullName,
          fatherName: studentData.student.fatherName || 'N/A',
          course: `${courseGroup.course.courseCode} - ${courseGroup.course.courseName}`,
          subjects: []
        };

        studentData.subjectResults.forEach(subjectResult => {
          const officialTests = subjectResult.tests.filter(test => test.testType === 'official');
          
          if (officialTests.length > 0) {
            officialTests.forEach(test => {
              const testResult = subjectResult.testResults.find(tr => tr.test._id === test._id);
              
              let gradePoints = 0;
              let grade = 'F';
              
              if (testResult && testResult.result.status === 'attempted') {
                const externalMarks = testResult.result.score || 0;
                const internalMarks = testResult.result.internalMarks ? testResult.result.internalMarks.marks : 0;
                const totalMarks = externalMarks + internalMarks;
                
                const gradeData = calculateGradeAndPoints(totalMarks, externalMarks, test.totalQuestions);
                gradePoints = gradeData.gradePoints;
                grade = gradeData.grade;
              } else {
                const gradeData = calculateGradeAndPoints(0, 0, test.totalQuestions, true);
                gradePoints = gradeData.gradePoints;
                grade = gradeData.grade;
              }

              studentResult.subjects.push({
                subjectCode: subjectResult.subject.subjectCode,
                subjectName: subjectResult.subject.subjectName,
                credits: 4,
                gradePoints: gradePoints,
                grade: grade
              });
            });
          } else {
            const gradeData = calculateGradeAndPoints(0, 0, 1, true);
            studentResult.subjects.push({
              subjectCode: subjectResult.subject.subjectCode,
              subjectName: subjectResult.subject.subjectName,
              credits: 4,
              gradePoints: gradeData.gradePoints,
              grade: gradeData.grade
            });
          }
        });

        const totalCredits = studentResult.subjects.reduce((sum, subject) => sum + subject.credits, 0);
        const totalGradePoints = studentResult.subjects.reduce((sum, subject) => sum + (subject.credits * subject.gradePoints), 0);
        studentResult.sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';

        results.push(studentResult);
      });
    });

    return results;
  };

  // Check if all internal marks have been entered for a report
  const areAllInternalMarksEntered = (report) => {
    const studentsWithAttempts = report.studentResults.filter(studentResult => {
      return studentResult.testResults.some(tr => 
        tr.result.status === 'attempted' && 
        report.tests.find(test => test._id === tr.test._id && test.testType === 'official')
      );
    });

    return studentsWithAttempts.every(studentResult => {
      return studentResult.testResults.some(tr => {
        const test = report.tests.find(test => test._id === tr.test._id && test.testType === 'official');
        return test && tr.result.status === 'attempted' && tr.result.internalMarks && tr.result.internalMarks.marks !== null;
      });
    });
  };

  // Course-wise validation functions
  const areAllInternalMarksEnteredForCourse = (reports) => {
    const reportsArray = Array.isArray(reports) ? reports : [reports];
    return reportsArray.every(report => areAllInternalMarksEntered(report));
  };

  const getMissingInternalMarksCountForCourse = (reports) => {
    const reportsArray = Array.isArray(reports) ? reports : [reports];
    let totalStudents = 0;
    let totalMissing = 0;
    
    reportsArray.forEach(report => {
      const studentsWithAttempts = report.studentResults.filter(studentResult => {
        return studentResult.testResults.some(tr => 
          tr.result.status === 'attempted' && 
          report.tests.find(test => test._id === tr.test._id && test.testType === 'official')
        );
      });

      const studentsWithoutMarks = studentsWithAttempts.filter(studentResult => {
        return !studentResult.testResults.some(tr => {
          const test = report.tests.find(test => test._id === tr.test._id && test.testType === 'official');
          return test && tr.result.status === 'attempted' && tr.result.internalMarks && tr.result.internalMarks.marks !== null;
        });
      });

      totalStudents += studentsWithAttempts.length;
      totalMissing += studentsWithoutMarks.length;
    });
    
    return { total: totalStudents, missing: totalMissing };
  };

  // Show results preview modal
  const showResultsPreviewModal = (courseCode) => {
    const courseReports = reports.filter(r => r.course.courseCode === courseCode);
    setSelectedReportForPreview(courseReports);
    setShowResultsPreview(true);
  };

  // Export results to PDF
  // Utility to force plain colors for PDF export, preserving layout and styling
  function forcePlainColorsForPDF(element) {
    if (!element) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null, false);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      el.style.color = '#000';
      el.style.backgroundColor = '#fff';
      el.style.borderColor = '#888';
    }
  }

  // Print-friendly PDF export using browser's print dialog
  const printResultsPreview = () => {
    if (!resultsPreviewRef.current) return;
    const printWindow = window.open('', '_blank');
    // Copy all CSS from main document
    let styles = '';
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach((node) => {
      styles += node.outerHTML;
    });
    printWindow.document.write(`
      <html>
        <head>
          <title>Results Export</title>
          ${styles}
        </head>
        <body>
          ${resultsPreviewRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Calculate final grade for a student
  const calculateFinalGrade = (student, subjects) => {
    let totalMarks = 0;
    let totalPossible = 0;
    
    subjects.forEach(subject => {
      const subjectResult = student.subjectResults.find(sr => sr.subjectCode === subject.subjectCode);
      if (subjectResult) {
        totalMarks += (subjectResult.testScore || 0) + (subjectResult.internalMarks || 0);
        totalPossible += subject.maxMarks || 100; // Assuming 100 max marks per subject
      }
    });
    
    const percentage = totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 100) : 0;
    
    if (percentage >= 90) return { grade: 'A+', percentage };
    if (percentage >= 80) return { grade: 'A', percentage };
    if (percentage >= 70) return { grade: 'B+', percentage };
    if (percentage >= 60) return { grade: 'B', percentage };
    if (percentage >= 50) return { grade: 'C', percentage };
    if (percentage >= 40) return { grade: 'D', percentage };
    return { grade: 'F', percentage };
  };

  // Load results when switching to results tab
  useEffect(() => {
    if (activeTab === 'results') {
      fetchCourseResults();
    }
  }, [activeTab]);

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

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-col sm:flex-row sm:space-x-8 space-y-1 sm:space-y-0">
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm w-full sm:w-auto text-left ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tests Management
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`py-2 px-1 border-b-2 font-medium text-sm w-full sm:w-auto text-left ${
                  activeTab === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Results Management
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'tests' && (
          <>
            {/* Statistics Cards */}
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
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
          </>
        )}

        {/* Results Tab Content */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {loadingResults ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Course Results Management</h2>
                  <p className="text-gray-600">
                    Release student results when all internal marks have been entered by evaluators.
                  </p>
                </div>

                {courseResults.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No course results available</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Results will appear here once students complete tests and evaluators enter internal marks.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {courseResults.map((courseResult, index) => {
                      const allMarksComplete = areAllInternalMarksComplete(courseResult);
                      
                      return (
                        <Card key={index} className="overflow-hidden">
                          <CardHeader className="bg-gray-50">
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-xl font-bold text-gray-900">
                                  {courseResult.courseName} ({courseResult.courseCode})
                                </CardTitle>
                                <p className="text-gray-600 mt-1">
                                  {courseResult.students.length} students • {courseResult.subjects.length} subjects
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {allMarksComplete ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Ready to Release
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Pending Internal Marks
                                    </Badge>
                                  )}
                                  {courseResult.resultsReleased && (
                                    <Badge className="bg-blue-100 text-blue-800">
                                      Results Released
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {/* Results Preview Button */}
                                <Button
                                  onClick={() => showResultsPreviewModal(courseResult.courseCode)}
                                  className="flex items-center gap-2"
                                  variant={(() => {
                                    const courseReports = reports.filter(r => 
                                      r.course.courseCode === courseResult.courseCode &&
                                      r.tests.some(test => test.testType === 'official')
                                    );
                                    return areAllInternalMarksEnteredForCourse(courseReports) ? "default" : "secondary";
                                  })()}
                                  size="sm"
                                  disabled={(() => {
                                    const courseReports = reports.filter(r => 
                                      r.course.courseCode === courseResult.courseCode &&
                                      r.tests.some(test => test.testType === 'official')
                                    );
                                    return courseReports.length === 0 || !areAllInternalMarksEnteredForCourse(courseReports);
                                  })()}
                                  title={(() => {
                                    const courseReports = reports.filter(r => 
                                      r.course.courseCode === courseResult.courseCode &&
                                      r.tests.some(test => test.testType === 'official')
                                    );
                                    if (courseReports.length === 0) {
                                      return "No official tests found for this course";
                                    }
                                    const allComplete = areAllInternalMarksEnteredForCourse(courseReports);
                                    if (allComplete) {
                                      return "View course-wise results preview with all subjects";
                                    } else {
                                      const counts = getMissingInternalMarksCountForCourse(courseReports);
                                      return `Internal marks pending for ${counts.missing} students across all subjects`;
                                    }
                                  })()}
                                >
                                  <Eye className="h-4 w-4" />
                                  Results Preview
                                  {(() => {
                                    const courseReports = reports.filter(r => 
                                      r.course.courseCode === courseResult.courseCode &&
                                      r.tests.some(test => test.testType === 'official')
                                    );
                                    return courseReports.length > 0 && areAllInternalMarksEnteredForCourse(courseReports) && (
                                      <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                        Ready
                                      </span>
                                    );
                                  })()}
                                </Button>
                                
                                {allMarksComplete && !courseResult.resultsReleased && (
                                  <Button
                                    onClick={() => releaseResults(courseResult.courseId)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Release Results
                                  </Button>
                                )}
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Export
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="p-6">
                            {/* Subject Progress Overview */}
                            <div className="mb-6">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Internal Marks Progress by Subject</h4>
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {courseResult.subjects.map((subject, subjectIndex) => {
                                  const completedMarks = courseResult.students.filter(student => {
                                    const subjectResult = student.subjectResults.find(sr => sr.subjectCode === subject.subjectCode);
                                    return subjectResult && subjectResult.internalMarks !== null;
                                  }).length;
                                  
                                  const percentage = Math.round((completedMarks / courseResult.students.length) * 100);
                                  
                                  return (
                                    <div key={subjectIndex} className="bg-gray-50 p-3 rounded-lg">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium">{subject.subjectCode}</span>
                                        <span className="text-sm text-gray-600">{completedMarks}/{courseResult.students.length}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-gray-500">{percentage}% complete</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Results Preview Modal */}
      {showResultsPreview && selectedReportForPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Results Preview - {Array.isArray(selectedReportForPreview) ? 
                  `${selectedReportForPreview[0].course.courseCode} - ${selectedReportForPreview[0].course.courseName}` :
                  `${selectedReportForPreview.course.courseCode} - ${selectedReportForPreview.course.courseName}`
                }
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={printResultsPreview}
                  className="flex items-center gap-2"
                  variant="default"
                  size="sm"
                >
                  <FileDown className="h-4 w-4" />
                  Export as PDF
                </Button>
                <Button
                  onClick={() => setShowResultsPreview(false)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="p-6" ref={resultsPreviewRef} style={{ backgroundColor: 'white' }}>
              {/* Internal Marks Status Warning */}
              {!areAllInternalMarksEnteredForCourse(selectedReportForPreview) && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Warning: Incomplete Internal Marks</span>
                  </div>
                  <p className="mt-2 text-sm text-amber-700">
                    {(() => {
                      const counts = getMissingInternalMarksCountForCourse(selectedReportForPreview);
                      return `${counts.missing} out of ${counts.total} students are missing internal marks. Results shown may be incomplete.`;
                    })()}
                  </p>
                </div>
              )}
              
              {/* Results Content */}
              <div className="space-y-8">
                {generateStudentResults(selectedReportForPreview).map((student, index) => (
                  <div key={index} className="border-b pb-6 last:border-b-0">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h1 className="text-xl font-bold">Acharya Nagarjuna University :: International Students Cell</h1>
                      <h2 className="text-lg font-semibold">ANU MOOCs - Online Diploma Programs</h2>
                      <h3 className="text-md">August-2025 Examination Results</h3>
                    </div>
                    
                    {/* Student Information */}
                    <div className="mb-6 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-semibold">Student Enrollment No:</span> {student.enrollmentNo}
                        </div>
                        <div>
                          <span className="font-semibold">Student Name:</span> {student.fullName}
                        </div>
                        <div>
                          <span className="font-semibold">Father Name:</span> {student.fatherName}
                        </div>
                        <div>
                          <span className="font-semibold">Course:</span> {student.course}
                        </div>
                      </div>
                    </div>
                    
                    {/* Results Table */}
                    <div className="mb-6">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-3 text-left">Subject</th>
                            <th className="border border-gray-300 p-3 text-center">Credits</th>
                            <th className="border border-gray-300 p-3 text-center">Grade Points</th>
                            <th className="border border-gray-300 p-3 text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.subjects.map((subject, subjectIndex) => (
                            <tr key={subjectIndex}>
                              <td className="border border-gray-300 p-3">
                                [{subject.subjectCode}] {subject.subjectName}
                              </td>
                              <td className="border border-gray-300 p-3 text-center">{subject.credits}</td>
                              <td className="border border-gray-300 p-3 text-center">{subject.gradePoints}</td>
                              <td className="border border-gray-300 p-3 text-center font-semibold">{subject.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* SGPA */}
                    <div className="mb-6">
                      <div className="text-lg">
                        <span className="font-semibold">SGPA:</span> {student.sgpa}
                      </div>
                    </div>
                    
                    {/* Note */}
                    <div className="mb-6">
                      <p className="text-sm">
                        <strong>NOTE:</strong> Grade Letter 'W' - Absent, 'F' - Fail
                      </p>
                    </div>
                    
                    {/* Coordinator Signature */}
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="mt-16">
                          <div className="border-t border-gray-400 pt-2 w-32">
                            Co-ordinator<br />
                            ANU MOOCs
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

