import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, FileText, Users, GraduationCap, ArrowLeft, Home, FileSpreadsheet, BookOpen, Badge, AlertCircle, Edit } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import DataMaintenanceSection from '../components/DataMaintenanceSection';
import api from '../lib/api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const Reports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  // NEW: States for question marking functionality
  const [showQuestionMarking, setShowQuestionMarking] = useState(false);
  const [selectedSubmissionForMarking, setSelectedSubmissionForMarking] = useState(null);

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
    const externalPercentage = (externalMarks / 70) * 100;
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

  // NEW: Function to fetch submission details with original question numbers
  const fetchSubmissionDetails = async (submissionId) => {
    try {
      const response = await api.get(`/results/submission-details/${submissionId}`);
      return response.data.submission;
    } catch (error) {
      console.error('Error fetching submission details:', error);
      toast.error('Failed to fetch submission details');
      return null;
    }
  };

  // NEW: Function to update question marks
  const updateQuestionMarks = async (submissionId, questionMarks) => {
    try {
      const response = await api.put(`/results/update-question-marks/${submissionId}`, {
        questionMarks
      });

      if (response.data) {
        toast.success('Marks updated successfully');
        // Refresh reports to show updated data
        fetchReports();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating question marks:', error);
      toast.error('Failed to update marks');
      return false;
    }
  };

  // NEW: Component for detailed question marking
  const QuestionMarkingModal = ({ isOpen, onClose, submissionData }) => {
    const [questionMarks, setQuestionMarks] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (submissionData) {
        // Initialize marks from existing data
        const initialMarks = {};
        submissionData.answers.forEach(answer => {
          initialMarks[answer.originalQuestionNumber] = answer.isCorrect ? 1 : 0;
        });
        setQuestionMarks(initialMarks);
      }
    }, [submissionData]);

    const handleMarkChange = (originalQuestionNumber, marks) => {
      setQuestionMarks(prev => ({
        ...prev,
        [originalQuestionNumber]: parseFloat(marks) || 0
      }));
    };

    const handleSaveMarks = async () => {
      setLoading(true);

      const marksArray = Object.entries(questionMarks).map(([questionNum, marks]) => ({
        originalQuestionNumber: parseInt(questionNum),
        marks: parseFloat(marks)
      }));

      const success = await updateQuestionMarks(submissionData._id, marksArray);

      if (success) {
        onClose();
      }

      setLoading(false);
    };

    if (!isOpen || !submissionData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Question-wise Marking - {submissionData.student.name} ({submissionData.student.enrollmentNo})
            </h3>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {submissionData.answers
              .sort((a, b) => a.originalQuestionNumber - b.originalQuestionNumber)
              .map((answer, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">Original Q{answer.originalQuestionNumber}</span>
                    <span className="text-sm text-gray-500">Shuffled Position: {answer.shuffledPosition}</span>
                  </div>

                  <div className="mb-2">
                    <span className="text-sm">
                      Student Answer: Option {answer.selectedAnswer + 1}
                      {answer.isCorrect ? ' ✓' : ' ✗'}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Marks:</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.5"
                      value={questionMarks[answer.originalQuestionNumber] || 0}
                      onChange={(e) => handleMarkChange(answer.originalQuestionNumber, e.target.value)}
                      className="ml-2 w-20 px-2 py-1 border rounded"
                    />
                  </div>
                </Card>
              ))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveMarks} disabled={loading}>
              {loading ? 'Saving...' : 'Save Marks'}
            </Button>
          </div>
        </div>
      </div>
    );
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
      `External Marks/70.00`
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
      // console.log(`Processing student: ${studentResult.student.fullName} (${studentResult.student.enrollmentNo})`);
      testsToInclude.forEach(test => {
        const testResult = studentResult.testResults.find(tr => tr.test._id === test._id);
        // if (Array.isArray(testResult.result.answers)) {
        //   testResult.result.answers.slice(0, 10).forEach((answer, ansIdx) => {
        //     console.log(`    Answer ${ansIdx}: Q${answer.originalQuestionNumber} = ${answer.isCorrect ? 'Correct' : 'Incorrect'}`);
        //   });
        // }
        if (testResult && testResult.result.status === 'attempted') {
          // Format dates for Indian timezone
          const testStartedOn = testResult.result.testStartedOn ? new Date(testResult.result.testStartedOn).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
          }) : '-';

          const testCompletedOn = testResult.result.submittedAt ? new Date(testResult.result.submittedAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
          }) : '-';

          // Calculate grade - each question carries 1 mark
          const gradeOutOfTotal = testResult.result.score;

          // Get internal marks
          const internalMarks = testResult.result.internalMarks ? testResult.result.internalMarks.marks : 0;

          // Calculate total marks (external + internal)
          const totalMarks = (gradeOutOfTotal || 0) + (internalMarks || 0);

          // Calculate grade points and grade
          const { gradePoints, grade } = calculateGradeAndPoints(totalMarks, gradeOutOfTotal, maxQuestions);

          // Create answer array for ALL questions
          // const questionStatuses = new Array(maxQuestions).fill('-');

          // Get the full list of original question numbers for the test (e.g., [1, 2, ... N])
          const fullQuestionNumbers = Array.from({ length: maxQuestions }, (_, i) => i + 1);

          // Build a lookup of the student's answers by originalQuestionNumber
          const answerMap = {};
          if (testResult.result.answers && Array.isArray(testResult.result.answers)) {
            testResult.result.answers.forEach(answer => {
              answerMap[answer.originalQuestionNumber] = answer.isCorrect ? '1.00' : '0.00';
            });
          }
          // console.log(`Answer map for student ${studentResult.student.fullName} (${studentResult.student.enrollmentNo}):`, answerMap);
          // Now build the statuses for export; '-' for questions not in answerMap (not shown to student)
          const questionStatuses = fullQuestionNumbers.map(qNum => {
            if (answerMap.hasOwnProperty(qNum)) {
              return answerMap[qNum];
            } else {
              return '-';
            }
          });


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
            testResult.result.internalMarks ? 'Entered' : 'Not Entered' // Internal marks status
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
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading reports...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="p-6">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
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

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-600">View detailed performance reports by course and subject</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="flex items-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subjects.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(groupedReports).reduce((sum, course) => sum + course.subjects.length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
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

        {/* Reports */}
        {Object.keys(groupedReports).length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No reports match your current filter criteria. Try adjusting the filters or ensure that tests and students exist for the selected courses.
            </AlertDescription>
          </Alert>
        ) : (
          Object.entries(groupedReports).map(([courseName, courseData]) => (
            <Card key={courseName} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  {courseName}
                </CardTitle>
                <p className="text-sm text-gray-600">{courseData.subjects.length} subject(s) available</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courseData.subjects.map((report, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">Subject Code: {report.subject.subjectCode}</h4>
                          <p className="text-gray-600">{report.subject.subjectName}</p>
                        </div>
                        <Badge variant="outline">
                          {report.tests.length} test(s)
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{report.studentResults.length}</div>
                          <div className="text-sm text-gray-600">Students</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{report.tests.length}</div>
                          <div className="text-sm text-gray-600">Tests</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(report.statistics.averageScore)}
                          </div>
                          <div className="text-sm text-gray-600">Avg Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {getInternalMarksStats(report).percentage}%
                          </div>
                          <div className="text-sm text-gray-600">Internal Marks</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => exportToExcel(report, 'all')}
                          className="flex items-center"
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export Combined Report
                        </Button>

                        <Button
                          onClick={() => exportToExcel(report, 'official')}
                          variant="outline"
                          className="flex items-center"
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export Official Only
                        </Button>

                        <Button
                          onClick={() => exportToExcel(report, 'demo')}
                          variant="outline"
                          className="flex items-center"
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export Demo Only
                        </Button>

                        {/* NEW: Question-wise marking button */}
                        <Button
                          onClick={async () => {
                            // Find a submission to work with (taking the first attempted one)
                            const studentWithSubmission = report.studentResults.find(sr =>
                              sr.testResults.some(tr => tr.result.status === 'attempted')
                            );

                            if (studentWithSubmission) {
                              const testResult = studentWithSubmission.testResults.find(tr => tr.result.status === 'attempted');
                              if (testResult && testResult.result.submissionId) {
                                const submissionDetails = await fetchSubmissionDetails(testResult.result.submissionId);
                                if (submissionDetails) {
                                  setSelectedSubmissionForMarking(submissionDetails);
                                  setShowQuestionMarking(true);
                                }
                              } else {
                                toast.error('No submission ID found for this test result');
                              }
                            } else {
                              toast.error('No attempted submissions found for question marking');
                            }
                          }}
                          variant="outline"
                          className="flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Question-wise Marking
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Data Maintenance Section */}
        <DataMaintenanceSection />
      </div>

      {/* Question Marking Modal */}
      <QuestionMarkingModal
        isOpen={showQuestionMarking}
        onClose={() => {
          setShowQuestionMarking(false);
          setSelectedSubmissionForMarking(null);
        }}
        submissionData={selectedSubmissionForMarking}
      />
    </div>
  );
};

export default Reports;
