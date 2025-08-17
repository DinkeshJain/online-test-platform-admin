import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { FileText, Users, GraduationCap, ArrowLeft, Home, FileSpreadsheet } from 'lucide-react';
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

  const filteredReports = reports.filter(report => {
    const courseMatch = selectedCourse === 'all' || 
      `${report.course.courseCode}-${report.course.courseName}` === selectedCourse;
    const subjectMatch = selectedSubject === 'all' || 
      `${report.subject.subjectCode}-${report.subject.subjectName}` === selectedSubject;
    
    return courseMatch && subjectMatch;
  });

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
    const testsToInclude = testType === 'all' ? report.tests : 
                          report.tests.filter(test => test.testType === testType);
    
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
          const testStartedOn = testResult.result.testStartedOn ? 
            new Date(testResult.result.testStartedOn).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Kolkata'
            }) : '-';

          const testCompletedOn = testResult.result.submittedAt ? 
            new Date(testResult.result.submittedAt).toLocaleString('en-IN', {
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
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: 'FFFF0000' },
        bgColor: { rgb: 'FFFF0000' }
      },
      font: { 
        color: { rgb: 'FFFFFFFF' },
        bold: true
      }
    };

    // Add orange background for 'W' grades (absent students)
    const absentStyle = {
      fill: { 
        patternType: 'solid',
        fgColor: { rgb: 'FFFF8000' },
        bgColor: { rgb: 'FFFF8000' }
      },
      font: { 
        color: { rgb: 'FFFFFFFF' },
        bold: true
      }
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
          worksheet[gradePointsCellRef] = { 
            v: rows[row][gradePointsCol], 
            t: 's' 
          };
        }
        worksheet[gradePointsCellRef].s = failStyle;

        // Apply red styling to Grade column
        const gradeCellRef = XLSX.utils.encode_cell({ r: row, c: gradeCol });
        if (!worksheet[gradeCellRef]) {
          worksheet[gradeCellRef] = { 
            v: 'F', 
            t: 's' 
          };
        }
        worksheet[gradeCellRef].s = failStyle;
      } else if (gradeValue === 'W') {
        // Apply orange styling to Grade Points column for absent students
        const gradePointsCellRef = XLSX.utils.encode_cell({ r: row, c: gradePointsCol });
        if (!worksheet[gradePointsCellRef]) {
          worksheet[gradePointsCellRef] = { 
            v: rows[row][gradePointsCol], 
            t: 's' 
          };
        }
        worksheet[gradePointsCellRef].s = absentStyle;

        // Apply orange styling to Grade column for absent students
        const gradeCellRef = XLSX.utils.encode_cell({ r: row, c: gradeCol });
        if (!worksheet[gradeCellRef]) {
          worksheet[gradeCellRef] = { 
            v: 'W', 
            t: 's' 
          };
        }
        worksheet[gradeCellRef].s = absentStyle;
      }
    }

    // Add worksheet to workbook
    const sheetName = testType === 'demo' ? 'Demo Report' : 
                     testType === 'official' ? 'Official Report' : 
                     `${report.subject.subjectCode} Report`;
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

  // Generate student result data for preview and PDF - now course-wise with all subjects
  const generateStudentResults = (reports) => {
    // Group reports by course
    const courseGroups = {};
    
    // If single report passed, convert to array
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
      
      // Add this subject to the course
      courseGroups[courseKey].subjects.push({
        subject: report.subject,
        tests: report.tests,
        studentResults: report.studentResults
      });
      
      // Merge student results
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
    
    // Process each course
    Object.values(courseGroups).forEach(courseGroup => {
      Object.values(courseGroup.studentResultsMap).forEach(studentData => {
        const studentResult = {
          enrollmentNo: studentData.student.enrollmentNo,
          fullName: studentData.student.fullName,
          fatherName: studentData.student.fatherName || 'N/A',
          course: `${courseGroup.course.courseCode} - ${courseGroup.course.courseName}`,
          subjects: []
        };

        // Process each subject for this student
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
                // Student was absent
                const gradeData = calculateGradeAndPoints(0, 0, test.totalQuestions, true);
                gradePoints = gradeData.gradePoints;
                grade = gradeData.grade;
              }

              studentResult.subjects.push({
                subjectCode: subjectResult.subject.subjectCode,
                subjectName: subjectResult.subject.subjectName,
                credits: 4, // Default credits as requested
                gradePoints: gradePoints,
                grade: grade
              });
            });
          } else {
            // No official tests, mark as absent
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

        // Calculate SGPA
        const totalCredits = studentResult.subjects.reduce((sum, subject) => sum + subject.credits, 0);
        const totalGradePoints = studentResult.subjects.reduce((sum, subject) => sum + (subject.credits * subject.gradePoints), 0);
        studentResult.sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';

        results.push(studentResult);
      });
    });

    return results;
  };

  // Check if all internal marks have been entered for course-wise reports
  const areAllInternalMarksEnteredForCourse = (reports) => {
    const reportsArray = Array.isArray(reports) ? reports : [reports];
    return reportsArray.every(report => areAllInternalMarksEntered(report));
  };

  // Get count of students missing internal marks for course-wise reports
  const getMissingInternalMarksCountForCourse = (reports) => {
    const reportsArray = Array.isArray(reports) ? reports : [reports];
    let totalStudents = 0;
    let totalMissing = 0;
    
    reportsArray.forEach(report => {
      const counts = getMissingInternalMarksCount(report);
      totalStudents += counts.total;
      totalMissing += counts.missing;
    });
    
    return {
      total: totalStudents,
      missing: totalMissing
    };
  };

  // Check if all internal marks have been entered for a report
  const areAllInternalMarksEntered = (report) => {
    // Get all students who have attempted official tests
    const studentsWithAttempts = report.studentResults.filter(studentResult => {
      return studentResult.testResults.some(tr => 
        tr.result.status === 'attempted' && 
        report.tests.find(test => test._id === tr.test._id && test.testType === 'official')
      );
    });

    // Check if all these students have internal marks
    return studentsWithAttempts.every(studentResult => {
      return studentResult.testResults.some(tr => {
        const test = report.tests.find(test => test._id === tr.test._id && test.testType === 'official');
        return test && tr.result.status === 'attempted' && tr.result.internalMarks && tr.result.internalMarks.marks !== null;
      });
    });
  };

  // Get count of students missing internal marks
  const getMissingInternalMarksCount = (report) => {
    // Get all students who have attempted official tests
    const studentsWithAttempts = report.studentResults.filter(studentResult => {
      return studentResult.testResults.some(tr => 
        tr.result.status === 'attempted' && 
        report.tests.find(test => test._id === tr.test._id && test.testType === 'official')
      );
    });

    // Count students without internal marks
    const studentsWithoutMarks = studentsWithAttempts.filter(studentResult => {
      return !studentResult.testResults.some(tr => {
        const test = report.tests.find(test => test._id === tr.test._id && test.testType === 'official');
        return test && tr.result.status === 'attempted' && tr.result.internalMarks && tr.result.internalMarks.marks !== null;
      });
    });

    return {
      total: studentsWithAttempts.length,
      missing: studentsWithoutMarks.length
    };
  };

  // Show results preview
  const showResultsPreviewModal = (courseReports) => {
    // If single report, find all reports for the same course
    let reportsForCourse;
    if (Array.isArray(courseReports)) {
      reportsForCourse = courseReports;
    } else {
      // Find all reports for the same course
      reportsForCourse = reports.filter(r => 
        r.course.courseCode === courseReports.course.courseCode
      );
    }
    
    setSelectedReportForPreview(reportsForCourse);
    setShowResultsPreview(true);
  };

  // Export results to PDF
  const exportResultsToPDF = async () => {
    if (!selectedReportForPreview || !resultsPreviewRef.current) return;

    try {
      const element = resultsPreviewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const courseData = Array.isArray(selectedReportForPreview) ? 
        selectedReportForPreview[0] : selectedReportForPreview;
      const fileName = `${courseData.course.courseCode}_Course_Results_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-md mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { courses, subjects } = getUniqueCoursesAndSubjects();

  return (
    <div>
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back Button and Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">Reports</span>
            </nav>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Course & Subject Reports</h1>
              <p className="text-gray-600">View detailed performance reports by course and subject</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/create-test')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Create Test
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedSubject('all'); // Reset subject when course changes
            }}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
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
              <FileText className="h-8 w-8 text-green-600" />
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
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{filteredReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Internal Marks Summary */}
      {filteredReports.some(report => report.tests.some(test => test.testType === 'official')) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Internal Marks Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const officialReports = filteredReports.filter(report => 
                  report.tests.some(test => test.testType === 'official')
                );
                const totalSubjects = officialReports.length;
                const completedSubjects = officialReports.filter(report => 
                  areAllInternalMarksEntered(report)
                ).length;
                const pendingSubjects = totalSubjects - completedSubjects;
                
                // Calculate total students across all subjects
                const allCounts = officialReports.map(report => getMissingInternalMarksCount(report));
                const totalStudents = allCounts.reduce((sum, count) => sum + count.total, 0);
                const completedMarks = allCounts.reduce((sum, count) => sum + count.completed, 0);
                const pendingMarks = totalStudents - completedMarks;
                
                return (
                  <>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{totalSubjects}</div>
                      <div className="text-sm text-blue-700">Total Subjects</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{completedSubjects}</div>
                      <div className="text-sm text-green-700">Marks Complete</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{pendingSubjects}</div>
                      <div className="text-sm text-orange-700">Marks Pending</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.round((completedMarks/totalStudents)*100) || 0}%</div>
                      <div className="text-sm text-purple-700">Overall Progress</div>
                    </div>
                  </>
                );
              })()}
            </div>
            {(() => {
              const officialReports = filteredReports.filter(report => 
                report.tests.some(test => test.testType === 'official')
              );
              const pendingReports = officialReports.filter(report => 
                !areAllInternalMarksEntered(report)
              );
              
              if (pendingReports.length > 0) {
                return (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-2">Subjects with Pending Internal Marks:</h4>
                    <div className="space-y-1">
                      {pendingReports.map((report, idx) => {
                        const counts = getMissingInternalMarksCount(report);
                        return (
                          <div key={idx} className="text-sm text-amber-700">
                            <span className="font-medium">{report.subject.subjectName} ({report.subject.subjectCode})</span>
                            <span className="ml-2">- {counts.missing} of {counts.total} students pending</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Data Maintenance Section */}
      <Card className="mb-6" id="data-maintenance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Data Consistency & Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataMaintenanceSection />
        </CardContent>
      </Card>

      {/* Reports */}
      <div className="space-y-8">
        {filteredReports.map((report, index) => {
          const internalMarksStats = getInternalMarksStats(report);
          
          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {report.tests.every(test => test.testType === 'demo') ? 
                        `(Demo) ${report.subject.subjectName} (${report.subject.subjectCode})` : 
                        `${report.subject.subjectName} (${report.subject.subjectCode})`
                      }
                    </CardTitle>
                    <p className="text-gray-600 mt-1">
                      Course: {report.course.courseName} ({report.course.courseCode})
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm text-gray-500">
                        {report.tests.length} test(s) • {report.studentResults.length} student(s)
                      </p>
                      {/* Test Type Badges */}
                      <div className="flex gap-2">
                        {report.tests.some(test => test.testType === 'official') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Official ({report.tests.filter(test => test.testType === 'official').length})
                          </span>
                        )}
                        {report.tests.some(test => test.testType === 'demo') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Demo ({report.tests.filter(test => test.testType === 'demo').length})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          internalMarksStats.percentage === 100 
                            ? 'bg-green-100 text-green-800' 
                            : internalMarksStats.percentage > 0 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Internal Marks: {internalMarksStats.studentsWithMarks}/{internalMarksStats.totalStudents} ({internalMarksStats.percentage}%)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Results Preview Button - Course-wise */}
                    {report.tests.some(test => test.testType === 'official') && (
                      <div className="flex flex-col items-start gap-1">
                        <Button
                          onClick={() => {
                            // Get all reports for this course
                            const courseReports = reports.filter(r => 
                              r.course.courseCode === report.course.courseCode
                            );
                            showResultsPreviewModal(courseReports);
                          }}
                          className="flex items-center gap-2"
                          variant={(() => {
                            // Check if all subjects in this course have complete internal marks
                            const courseReports = reports.filter(r => 
                              r.course.courseCode === report.course.courseCode &&
                              r.tests.some(test => test.testType === 'official')
                            );
                            return areAllInternalMarksEnteredForCourse(courseReports) ? "default" : "secondary";
                          })()}
                          size="sm"
                          disabled={(() => {
                            const courseReports = reports.filter(r => 
                              r.course.courseCode === report.course.courseCode &&
                              r.tests.some(test => test.testType === 'official')
                            );
                            return !areAllInternalMarksEnteredForCourse(courseReports);
                          })()}
                          title={(() => {
                            const courseReports = reports.filter(r => 
                              r.course.courseCode === report.course.courseCode &&
                              r.tests.some(test => test.testType === 'official')
                            );
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
                          Course Results Preview
                          {(() => {
                            const courseReports = reports.filter(r => 
                              r.course.courseCode === report.course.courseCode &&
                              r.tests.some(test => test.testType === 'official')
                            );
                            return areAllInternalMarksEnteredForCourse(courseReports) && (
                              <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                Ready
                              </span>
                            );
                          })()}
                        </Button>
                        {!areAllInternalMarksEntered(report) && (
                          <span className="text-xs text-orange-600">
                            {(() => {
                              const counts = getMissingInternalMarksCount(report);
                              return `Internal marks: ${counts.completed}/${counts.total} completed`;
                            })()}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Export Demo Exams Button */}
                    {report.tests.some(test => test.testType === 'demo') && (
                      <Button
                        onClick={() => exportToExcel(report, 'demo')}
                        className="flex items-center gap-2"
                        variant="outline"
                        size="sm"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Demo
                      </Button>
                    )}
                    
                    {/* Export Official Exams Button */}
                    {report.tests.some(test => test.testType === 'official') && (
                      <Button
                        onClick={() => exportToExcel(report, 'official')}
                        className="flex items-center gap-2"
                        variant="default"
                        size="sm"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Official
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600">
              No reports match your current filter criteria. Try adjusting the filters or ensure that tests and students exist for the selected courses.
            </p>
          </CardContent>
        </Card>
      )}
      
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
                  onClick={exportResultsToPDF}
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
              
              {/* Success message when all marks are complete */}
              {areAllInternalMarksEnteredForCourse(selectedReportForPreview) && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">All Internal Marks Complete</span>
                  </div>
                  <p className="mt-2 text-sm text-green-700">
                    All students have internal marks entered. Results are ready for publication.
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
    </div>
  );
};

export default Reports;
