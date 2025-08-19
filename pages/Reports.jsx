import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, FileText, Users, GraduationCap, ArrowLeft, Home, FileSpreadsheet, BookOpen, Badge, AlertCircle } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import DataMaintenanceSection from '../components/DataMaintenanceSection';
import api from '../lib/api';
import * as XLSX from 'xlsx';

const Reports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  // Reset subject selection when course changes
  useEffect(() => {
    setSelectedSubject('all');
  }, [selectedCourse]);

  // Helper function to format time in minutes and seconds
  const formatTimeSpent = (timeInSeconds, testDurationMinutes, testStartTime, testEndTime) => {
    // Use the stored timeSpent value as it's the most accurate
    if (!timeInSeconds || timeInSeconds === 0) {
      return '-';
    }

    // Use the timeSpent value directly as it's calculated and stored during test submission
    let actualTimeSpent = timeInSeconds;

    // Only use timestamp calculation as a fallback if timeSpent is 0 but we have timestamps
    if (timeInSeconds === 0 && testStartTime && testEndTime) {
      const startTime = new Date(testStartTime);
      const endTime = new Date(testEndTime);
      const calculatedTime = Math.floor((endTime - startTime) / 1000);
      if (calculatedTime > 0) {
        actualTimeSpent = calculatedTime;
      }
    }

    // Ensure we don't have negative time
    actualTimeSpent = Math.max(0, actualTimeSpent);

    const minutes = Math.floor(actualTimeSpent / 60);
    const seconds = actualTimeSpent % 60;

    if (minutes > 0) {
      return `${minutes} mins ${seconds} secs`;
    } else {
      return `${seconds} secs`;
    }
  };

  const calculateGradeAndPoints = (totalMarks, externalMarks, maxExternalMarks, isAbsent = false) => {
    // Check if student is absent - they get 'W' grade with 0 grade points
    if (isAbsent) {
      return { gradePoints: 0, grade: 'W' };
    }

    // Check if student failed due to insufficient external marks (less than 35%)
    const externalPercentage = maxExternalMarks > 0 ? (externalMarks / maxExternalMarks) * 100 : 0;
    const hasMinimumExternal = externalPercentage >= 35;

    // If external marks are insufficient, student fails regardless of total marks
    if (!hasMinimumExternal) {
      return { gradePoints: '-', grade: 'F' };
    }

    // Calculate grade based on total marks
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

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/submissions/reports/course-subject');
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueCoursesAndSubjects = () => {
    const courses = [...new Set(reports.map(r => `${r.course.courseCode}-${r.course.courseName}`))];

    // Get subjects filtered by selected course
    let subjects;
    if (selectedCourse === 'all') {
      subjects = [...new Set(reports.map(r => `${r.subject.subjectCode}-${r.subject.subjectName}`))];
    } else {
      subjects = [...new Set(reports
        .filter(r => `${r.course.courseCode}-${r.course.courseName}` === selectedCourse)
        .map(r => `${r.subject.subjectCode}-${r.subject.subjectName}`))];
    }

    return { courses, subjects };
  };

  // Group reports by course
  const getGroupedReports = () => {
    const filteredReports = reports.filter(report => {
      const courseMatch = selectedCourse === 'all' || `${report.course.courseCode}-${report.course.courseName}` === selectedCourse;
      const subjectMatch = selectedSubject === 'all' || `${report.subject.subjectCode}-${report.subject.subjectName}` === selectedSubject;
      return courseMatch && subjectMatch;
    });

    const groupedByCourse = {};
    filteredReports.forEach(report => {
      const courseKey = `${report.course.courseName} (${report.course.courseCode})`;
      if (!groupedByCourse[courseKey]) {
        groupedByCourse[courseKey] = {
          course: report.course,
          subjects: []
        };
      }
      groupedByCourse[courseKey].subjects.push(report);
    });

    return groupedByCourse;
  };

  // Calculate internal marks statistics for a report
  const getInternalMarksStats = (report) => {
    let totalStudents = 0;
    let studentsWithMarks = 0;

    report.studentResults.forEach(studentResult => {
      studentResult.testResults.forEach(testResult => {
        if (testResult.result.status === 'attempted') {
          totalStudents++;
          if (testResult.result.internalMarks) {
            studentsWithMarks++;
          }
        }
      });
    });

    return {
      totalStudents,
      studentsWithMarks,
      percentage: totalStudents > 0 ? Math.round((studentsWithMarks / totalStudents) * 100) : 0
    };
  };

  const exportToExcel = (report, testType = 'all') => {
    // Filter tests based on testType parameter
    const testsToInclude = testType === 'all' ? report.tests : report.tests.filter(test => test.testType === testType);

    if (testsToInclude.length === 0) {
      alert(`No ${testType === 'demo' ? 'demo' : testType === 'official' ? 'official' : ''} tests found for this subject.`);
      return;
    }

    // Get maximum number of questions across filtered tests for proper header
    const maxQuestions = Math.max(...testsToInclude.map(test => test.totalQuestions), 0);

    // Create dynamic headers based on the maximum number of questions in any test
    const baseHeaders = [
      'Enrollment Number',
      'Full Name',
      'Student Email Address',
      'State (Finished or Not)',
      'Test Started On',
      'Test Completed On',
      'Time Taken (mins:secs)',
      'Grade Points',
      'Grade',
      'Total Marks',
      'Internal Marks',
      `External Marks/${maxQuestions}.00`
    ];

    // Create question headers using the already calculated maxQuestions
    const questionHeaders = [];
    for (let i = 1; i <= maxQuestions; i++) {
      questionHeaders.push(`Q${i}`);
    }

    const headers = [...baseHeaders, ...questionHeaders, 'Internal Marks Status'];
    const rows = [headers];

    report.studentResults.forEach(studentResult => {
      // For each test the student took, create a separate row (only for filtered tests)
      testsToInclude.forEach(test => {
        const testResult = studentResult.testResults.find(tr => tr.test._id === test._id);

        if (testResult && testResult.result.status === 'attempted') {
          // Format dates for Indian timezone
          const testStartedOn = testResult.result.testStartedOn
            ? new Date(testResult.result.testStartedOn).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Kolkata'
            })
            : '-';

          const testCompletedOn = testResult.result.submittedAt
            ? new Date(testResult.result.submittedAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Kolkata'
            })
            : '-';

          // Calculate grade - each question carries 1 mark
          const gradeOutOfTotal = testResult.result.score;

          // Get internal marks
          const internalMarks = testResult.result.internalMarks ? testResult.result.internalMarks.marks : 0;

          // Calculate total marks (external + internal)
          const totalMarks = (gradeOutOfTotal || 0) + (internalMarks || 0);

          // Calculate grade points and grade
          const { gradePoints, grade } = calculateGradeAndPoints(totalMarks, gradeOutOfTotal, maxQuestions);

          // Create question status array
          const questionStatuses = new Array(maxQuestions).fill('-');

          // Fill in question results if answers are available
          if (testResult.result.answers && Array.isArray(testResult.result.answers)) {
            testResult.result.answers.forEach((answer, index) => {
              if (index < maxQuestions) {
                questionStatuses[index] = answer.isCorrect ? '1.00' : '0.00';
              }
            });
          }

          const row = [
            studentResult.student.enrollmentNo,
            studentResult.student.fullName,
            studentResult.student.emailId || '-',
            'Finished',
            testStartedOn,
            testCompletedOn,
            formatTimeSpent(
              testResult.result.timeSpent,
              testResult.test.duration,
              testResult.result.testStartedOn,
              testResult.result.submittedAt
            ), // Format as mins and secs based on total time - time left
            gradePoints, // Grade points
            grade, // Grade
            totalMarks, // Total marks (external + internal)
            testResult.result.internalMarks ? testResult.result.internalMarks.marks : '', // Internal marks from evaluator
            gradeOutOfTotal, // External marks
            ...questionStatuses.map(status => status === '-' ? '-' : parseFloat(status)),
            testResult.result.internalMarks ? '... Entered' : 'Not Entered' // Internal marks status
          ];

          rows.push(row);
        } else if (testResult) {
          // Student didn't attempt the test but is enrolled - mark as absent
          const questionStatuses = new Array(maxQuestions).fill('-');

          // Calculate grade for absent student
          const { gradePoints, grade } = calculateGradeAndPoints(0, 0, maxQuestions, true); // true for isAbsent

          const row = [
            studentResult.student.enrollmentNo,
            studentResult.student.fullName,
            studentResult.student.emailId || '-',
            'Absent',
            '-',
            '-',
            '-',
            gradePoints, // Grade points for absent student (0)
            grade, // Grade for absent student ('W')
            0, // Total marks is 0 for absent students
            '', // Empty internal marks for absent students
            0, // External marks is 0 for absent students
            ...questionStatuses,
            'Not Applicable' // Status for absent students
          ];

          rows.push(row);
        }
      });
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Calculate column widths based on content
    const colWidths = [];

    // Calculate width for each column
    for (let col = 0; col < headers.length; col++) {
      let maxWidth = 10; // Minimum width

      // Check header width
      if (headers[col]) {
        maxWidth = Math.max(maxWidth, headers[col].length);
      }

      // Check data rows width
      for (let row = 1; row < rows.length; row++) {
        if (rows[row][col]) {
          const cellValue = String(rows[row][col]);
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }

      // Add some padding and set reasonable limits
      colWidths.push({ width: Math.min(Math.max(maxWidth + 2, 12), 50) });
    }

    // Apply column widths
    worksheet['!cols'] = colWidths;

    // Add some styling to headers
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { bgColor: { rgb: "366092" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Apply header styling
    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) worksheet[cellRef] = {};
      worksheet[cellRef].s = headerStyle;
    }

    // Add red background for 'F' grades
    const failStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: 'FFFF0000' }, bgColor: { rgb: 'FFFF0000' } },
      font: { color: { rgb: 'FFFFFFFF' }, bold: true }
    };

    // Add orange background for 'W' grades (absent students)
    const absentStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: 'FFFF8000' }, bgColor: { rgb: 'FFFF8000' } },
      font: { color: { rgb: 'FFFFFFFF' }, bold: true }
    };

    // Find the Grade Points and Grade columns (columns 7 and 8 after removing Test Type)
    const gradePointsCol = 7;
    const gradeCol = 8;

    // Apply styling to rows with 'F' or 'W' grades
    for (let row = 1; row < rows.length; row++) {
      const gradeValue = rows[row][gradeCol];
      if (gradeValue === 'F') {
        // Apply red styling to Grade Points column
        const gradePointsCellRef = XLSX.utils.encode_cell({ r: row, c: gradePointsCol });
        if (!worksheet[gradePointsCellRef]) {
          worksheet[gradePointsCellRef] = { v: rows[row][gradePointsCol], t: 's' };
        }
        worksheet[gradePointsCellRef].s = failStyle;

        // Apply red styling to Grade column
        const gradeCellRef = XLSX.utils.encode_cell({ r: row, c: gradeCol });
        if (!worksheet[gradeCellRef]) {
          worksheet[gradeCellRef] = { v: 'F', t: 's' };
        }
        worksheet[gradeCellRef].s = failStyle;
      } else if (gradeValue === 'W') {
        // Apply orange styling to Grade Points column for absent students
        const gradePointsCellRef = XLSX.utils.encode_cell({ r: row, c: gradePointsCol });
        if (!worksheet[gradePointsCellRef]) {
          worksheet[gradePointsCellRef] = { v: rows[row][gradePointsCol], t: 's' };
        }
        worksheet[gradePointsCellRef].s = absentStyle;

        // Apply orange styling to Grade column for absent students
        const gradeCellRef = XLSX.utils.encode_cell({ r: row, c: gradeCol });
        if (!worksheet[gradeCellRef]) {
          worksheet[gradeCellRef] = { v: 'W', t: 's' };
        }
        worksheet[gradeCellRef].s = absentStyle;
      }
    }

    // Add worksheet to workbook
    const sheetName = testType === 'demo' ? 'Demo Report' : testType === 'official' ? 'Official Report' : `${report.subject.subjectCode} Report`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Add conditional formatting for failed students (alternative approach)
    // This creates a more visible marking for failed students
    worksheet['!conditionalFormats'] = [
      {
        ref: `I2:I${rows.length}`, // Grade column (column I = 9th column, index 8)
        rules: [
          {
            type: 'containsText',
            operator: 'containsText',
            formula: ['F'],
            style: {
              fill: { fgColor: { rgb: 'FFFF0000' } },
              font: { color: { rgb: 'FFFFFFFF' }, bold: true }
            }
          }
        ]
      }
    ];

    // Generate and download file with appropriate naming for separate workbooks
    let fileName;
    if (testType === 'demo') {
      fileName = `(Demo)_${report.course.courseCode}_${report.subject.subjectCode}_detailed_report.xlsx`;
    } else if (testType === 'official') {
      fileName = `${report.course.courseCode}_${report.subject.subjectCode}_detailed_report.xlsx`;
    } else {
      fileName = `${report.course.courseCode}_${report.subject.subjectCode}_combined_report.xlsx`;
    }

    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const { courses, subjects } = getUniqueCoursesAndSubjects();
  const groupedReports = getGroupedReports();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-2 text-gray-600">View detailed performance reports by course and subject</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.values(groupedReports).reduce((sum, course) => sum + course.subjects.length, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Filter Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course-wise Reports */}
        <div className="space-y-8">
          {Object.keys(groupedReports).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Available</h3>
                <p className="text-gray-600">
                  No reports match your current filter criteria. Try adjusting the filters or ensure that tests and students exist for the selected courses.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedReports).map(([courseName, courseData]) => (
              <div key={courseName} className="space-y-4">
                {/* Course Header */}
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <GraduationCap className="h-7 w-7 text-blue-600" />
                    {courseName}
                  </h2>
                  <p className="text-gray-600 mt-1">{courseData.subjects.length} subject(s) available</p>
                </div>

                {/* Subject Cards for this Course */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courseData.subjects.map((report, index) => {
                    const internalMarksStats = getInternalMarksStats(report);

                    return (
                      <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {report.subject.subjectName}
                              </CardTitle>
                              <p className="text-sm text-gray-600 mt-1">
                                Subject Code: {report.subject.subjectCode}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <span>{report.tests.length} test(s)</span>
                                <span>â€¢</span>
                                <span>{report.studentResults.length} student(s)</span>
                              </div>

                              {/* Test Type Badges */}
                              <div className="flex gap-1 mt-2">
                                {report.tests.some(test => test.testType === 'demo') && (
                                  <Badge variant="secondary" className="text-xs px-2 py-1">Demo</Badge>
                                )}
                                {report.tests.some(test => test.testType === 'official') && (
                                  <Badge variant="default" className="text-xs px-2 py-1">Official</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Internal Marks Status */}
                          {internalMarksStats.totalStudents > 0 && (
                            <div className="mt-3">
                              <Alert className={internalMarksStats.percentage === 100 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                                <AlertDescription className={`text-xs ${internalMarksStats.percentage === 100 ? "text-green-800" : "text-yellow-800"}`}>
                                  Internal Marks: {internalMarksStats.studentsWithMarks}/{internalMarksStats.totalStudents} ({internalMarksStats.percentage}%)
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <Button
                              onClick={() => exportToExcel(report, 'all')}
                              className="w-full flex items-center justify-center gap-2 text-sm"
                              size="sm"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                              Export All Tests
                            </Button>

                            <div className="flex gap-2">
                              {report.tests.some(test => test.testType === 'demo') && (
                                <Button
                                  variant="outline"
                                  onClick={() => exportToExcel(report, 'demo')}
                                  className="flex-1 flex items-center justify-center gap-1 text-xs"
                                  size="sm"
                                >
                                  <FileSpreadsheet className="h-3 w-3" />
                                  Demo
                                </Button>
                              )}

                              {report.tests.some(test => test.testType === 'official') && (
                                <Button
                                  variant="outline"
                                  onClick={() => exportToExcel(report, 'official')}
                                  className="flex-1 flex items-center justify-center gap-1 text-xs"
                                  size="sm"
                                >
                                  <FileSpreadsheet className="h-3 w-3" />
                                  Official
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Data Maintenance Section */}
        <div className="mt-12">
          <DataMaintenanceSection />
        </div>
      </div>
    </div>
  );
};

export default Reports;