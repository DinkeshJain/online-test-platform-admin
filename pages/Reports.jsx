import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, FileSpreadsheet, Edit, BookOpen, GraduationCap, FileText, Badge, AlertCircle, Home } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import api from '../lib/api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const Reports = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [reportsBySubject, setReportsBySubject] = useState({});

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showQuestionMarking, setShowQuestionMarking] = useState(false);
  const [selectedSubmissionForMarking, setSelectedSubmissionForMarking] = useState(null);

  // Fetch courses with reports on component mount
  useEffect(() => {
    fetchCoursesWithReports();
  }, []);

  // Fetch courses that have results
  const fetchCoursesWithReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/results/courses-with-results');
      setCourses(res.data.courses || []);
      setError('');
    } catch (err) {
      toast.error('Failed to load courses');
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subjects for selected course
  useEffect(() => {
    if (!selectedCourse) {
      setSubjects([]);
      setSelectedSubject('');
      setReportsBySubject({});
      return;
    }
    fetchSubjectsForCourse(selectedCourse);
  }, [selectedCourse]);

  const fetchSubjectsForCourse = async (courseId) => {
    setLoading(true);
    try {
      const res = await api.get(`/results/subjects-by-course/${courseId}`);
      setSubjects(res.data.subjects || []);
      setSelectedSubject('');
      setReportsBySubject({});
      setError('');
    } catch (err) {
      toast.error('Failed to load subjects');
      setSubjects([]);
      setSelectedSubject('');
      setReportsBySubject({});
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  // Load reports for selected subject (lazy load)
  const loadSubjectReport = async (subjectCode, examType) => {
    setSelectedSubject(subjectCode);
    setSelectedExamType(examType);
    if (!reportsBySubject[subjectCode] || reportsBySubject[subjectCode].examType !== examType) {
      setLoading(true);
      try {
        const res = await api.get(
          `/results/reports/${selectedCourse}/${subjectCode}?examType=${examType}`
        );
        setReportsBySubject(prev => ({
          ...prev,
          [subjectCode]: { ...res.data.report, examType }
        }));
        setError('');
      } catch (err) {
        toast.error('Failed to load report data');
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper function to format time in minutes and seconds
  const formatTimeSpent = (timeInSeconds, testDurationMinutes, testStartTime, testEndTime) => {
    if (!timeInSeconds || timeInSeconds === 0) return '-';

    let actualTimeSpent = timeInSeconds;

    // Fallback calculation if timeSpent is 0 but we have timestamps
    if (timeInSeconds === 0 && testStartTime && testEndTime) {
      const startTime = new Date(testStartTime);
      const endTime = new Date(testEndTime);
      const calculatedTime = Math.floor((endTime - startTime) / 1000);
      if (calculatedTime > 0) {
        actualTimeSpent = calculatedTime;
      }
    }

    actualTimeSpent = Math.max(0, actualTimeSpent);
    const minutes = Math.floor(actualTimeSpent / 60);
    const seconds = actualTimeSpent % 60;

    return minutes > 0 ? `${minutes} mins ${seconds} secs` : `${seconds} secs`;
  };

  const calculateGradeAndPoints = (totalMarks, externalMarks, maxExternalMarks, isAbsent = false) => {
    if (isAbsent) {
      return { gradePoints: 0, grade: 'W' };
    }

    // Check if student failed due to insufficient external marks (less than 35%)
    const externalPercentage = (externalMarks / 70) * 100;
    const hasMinimumExternal = externalPercentage >= 35;

    if (!hasMinimumExternal) {
      return { gradePoints: '-', grade: 'F' };
    }

    // Calculate grade based on total marks
    if (totalMarks >= 90) return { gradePoints: 10, grade: 'O' };
    if (totalMarks >= 80) return { gradePoints: 9, grade: 'A' };
    if (totalMarks >= 70) return { gradePoints: 8, grade: 'B' };
    if (totalMarks >= 60) return { gradePoints: 7, grade: 'C' };
    if (totalMarks >= 50) return { gradePoints: 6, grade: 'D' };
    if (totalMarks >= 40) return { gradePoints: 5, grade: 'E' };
    return { gradePoints: '-', grade: 'F' };
  };

  // // Function to update question marks
  // const updateQuestionMarks = async (submissionId, questionMarks) => {
  //   try {
  //     const response = await api.put(`/results/update-question-marks/${submissionId}`, {
  //       questionMarks
  //     });

  //     if (response.data) {
  //       toast.success('Marks updated successfully');
  //       // Refresh current subject report
  //       if (selectedSubject) {
  //         setReportsBySubject(prev => ({
  //           ...prev,
  //           [selectedSubject]: undefined
  //         }));
  //         loadSubjectReport(selectedSubject);
  //       }
  //       return true;
  //     }
  //     return false;
  //   } catch (error) {
  //     console.error('Error updating question marks:', error);
  //     toast.error('Failed to update marks');
  //     return false;
  //   }
  // };

  // // Component for detailed question marking
  // const QuestionMarkingModal = ({ isOpen, onClose, submissionData }) => {
  //   const [questionMarks, setQuestionMarks] = useState({});
  //   const [modalLoading, setModalLoading] = useState(false);

  //   useEffect(() => {
  //     if (submissionData) {
  //       const initialMarks = {};
  //       submissionData.answers.forEach(answer => {
  //         initialMarks[answer.originalQuestionNumber] = answer.isCorrect ? 1 : 0;
  //       });
  //       setQuestionMarks(initialMarks);
  //     }
  //   }, [submissionData]);

  //   const handleMarkChange = (originalQuestionNumber, marks) => {
  //     setQuestionMarks(prev => ({
  //       ...prev,
  //       [originalQuestionNumber]: parseFloat(marks) || 0
  //     }));
  //   };

  //   const handleSaveMarks = async () => {
  //     setModalLoading(true);

  //     const marksArray = Object.entries(questionMarks).map(([questionNum, marks]) => ({
  //       originalQuestionNumber: parseInt(questionNum),
  //       marks: parseFloat(marks)
  //     }));

  //     const success = await updateQuestionMarks(submissionData._id, marksArray);

  //     if (success) {
  //       onClose();
  //     }

  //     setModalLoading(false);
  //   };

  //   if (!isOpen || !submissionData) return null;

  //   return (
  //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  //       <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
  //         <div className="flex justify-between items-center mb-4">
  //           <h3 className="text-lg font-semibold">
  //             Question-wise Marking - {submissionData.student.name} ({submissionData.student.enrollmentNo})
  //           </h3>
  //           <Button variant="outline" onClick={onClose}>Close</Button>
  //         </div>

  //         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  //           {submissionData.answers
  //             .sort((a, b) => a.originalQuestionNumber - b.originalQuestionNumber)
  //             .map((answer, index) => (
  //               <Card key={index} className="p-4">
  //                 <div className="flex justify-between items-start mb-2">
  //                   <span className="font-medium">Original Q{answer.originalQuestionNumber}</span>
  //                   <span className="text-sm text-gray-500">Shuffled Position: {answer.shuffledPosition}</span>
  //                 </div>

  //                 <div className="mb-2">
  //                   <span className="text-sm">
  //                     Student Answer: Option {answer.selectedAnswer + 1}
  //                     {answer.isCorrect ? ' ✓' : ' ✗'}
  //                   </span>
  //                 </div>

  //                 <div>
  //                   <label className="text-sm font-medium">Marks:</label>
  //                   <input
  //                     type="number"
  //                     min="0"
  //                     max="1"
  //                     step="0.5"
  //                     value={questionMarks[answer.originalQuestionNumber] || 0}
  //                     onChange={(e) => handleMarkChange(answer.originalQuestionNumber, e.target.value)}
  //                     className="ml-2 w-20 px-2 py-1 border rounded"
  //                   />
  //                 </div>
  //               </Card>
  //             ))}
  //         </div>

  //         <div className="flex justify-end space-x-2">
  //           <Button variant="outline" onClick={onClose}>Cancel</Button>
  //           <Button onClick={handleSaveMarks} disabled={modalLoading}>
  //             {modalLoading ? 'Saving...' : 'Save Marks'}
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  // Calculate internal marks statistics for a report
  // const getInternalMarksStats = (report) => {
  //   let totalStudents = 0;
  //   let studentsWithMarks = 0;

  //   report.studentResults.forEach(studentResult => {
  //     studentResult.testResults.forEach(testResult => {
  //       if (testResult.result.status === 'attempted') {
  //         totalStudents++;
  //         if (testResult.result.internalMarks) {
  //           studentsWithMarks++;
  //         }
  //       }
  //     });
  //   });

  //   return {
  //     totalStudents,
  //     studentsWithMarks,
  //     percentage: totalStudents > 0 ? Math.round((studentsWithMarks / totalStudents) * 100) : 0
  //   };
  // };

  // Excel Export Function - Complete from your previous file
  const exportToExcel = (report, testType = 'all') => {
    const testsToInclude = testType === 'all'
      ? report.tests
      : report.tests.filter(test => test.testType === testType);

    if (testsToInclude.length === 0) {
      alert(`No ${testType === 'demo' ? 'demo' : testType === 'official' ? 'official' : ''} tests found for this subject.`);
      return;
    }

    const maxQuestions = Math.max(...testsToInclude.map(test => test.totalQuestions), 0);

    // Build headers based on export type
    let baseHeaders;
    if (testType === 'demo') {
      baseHeaders = [
        'Enrollment Number',
        'Full Name',
        'State (Finished or Not)',
        'Time Taken (mins:secs)',
        'External Marks/70.00'
      ];
    } else {
      baseHeaders = [
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
        'External Marks/70.00'
      ];
    }

    const questionHeaders = [];
    for (let i = 1; i <= maxQuestions; i++) {
      questionHeaders.push(`Q${i}`);
    }

    const headers = [...baseHeaders, ...questionHeaders];
    // NOTE: Internal Marks Status completely removed from all exports
    const rows = [headers];

    report.studentResults.forEach(studentResult => {
      testsToInclude.forEach(test => {
        const testResult = studentResult.testResults.find(tr => tr.test._id === test._id);

        const fullQuestionNumbers = Array.from({ length: maxQuestions }, (_, i) => i + 1);
        const answerMap = {};

        if (testResult && testResult.result.answers && Array.isArray(testResult.result.answers)) {
          testResult.result.answers.forEach(answer => {
            answerMap[answer.originalQuestionNumber] = answer.isCorrect ? '1.00' : '0.00';
          });
        }

        const questionStatuses = fullQuestionNumbers.map(qNum =>
          answerMap.hasOwnProperty(qNum) ? answerMap[qNum] : '-'
        );

        if (testResult && testResult.result.status === 'attempted') {
          const testStartedOn = testResult.result.testStartedOn
            ? new Date(testResult.result.testStartedOn).toLocaleString('en-IN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
            }) : '-';

          const testCompletedOn = testResult.result.submittedAt
            ? new Date(testResult.result.submittedAt).toLocaleString('en-IN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
            }) : '-';

          const gradeOutOfTotal = testResult.result.score;
          const internalMarks = testResult.result.internalMarks ? testResult.result.internalMarks.marks : 0;
          const totalMarks = (gradeOutOfTotal || 0) + (internalMarks || 0);
          const { gradePoints, grade } = calculateGradeAndPoints(totalMarks, gradeOutOfTotal, maxQuestions);

          let row;
          if (testType === 'demo') {
            row = [
              studentResult.student.enrollmentNo,
              studentResult.student.fullName,
              'Finished',
              formatTimeSpent(testResult.result.timeSpent, testResult.test.duration,
                testResult.result.testStartedOn, testResult.result.submittedAt),
              gradeOutOfTotal,
              ...questionStatuses.map(status => status === '-' ? '-' : parseFloat(status))
            ];
          } else {
            row = [
              studentResult.student.enrollmentNo,
              studentResult.student.fullName,
              studentResult.student.emailId || '-',
              'Finished',
              testStartedOn,
              testCompletedOn,
              formatTimeSpent(testResult.result.timeSpent, testResult.test.duration,
                testResult.result.testStartedOn, testResult.result.submittedAt),
              gradePoints,
              grade,
              totalMarks,
              testResult.result.internalMarks ? testResult.result.internalMarks.marks : '',
              gradeOutOfTotal,
              ...questionStatuses.map(status => status === '-' ? '-' : parseFloat(status))
            ];
          }
          rows.push(row);

        } else if (testResult) {
          // Absent students
          const questionStatuses = new Array(maxQuestions).fill('-');
          const { gradePoints, grade } = calculateGradeAndPoints(0, 0, maxQuestions, true);

          let row;
          if (testType === 'demo') {
            row = [
              studentResult.student.enrollmentNo,
              studentResult.student.fullName,
              'Absent',
              '-',
              0,
              ...questionStatuses
            ];
          } else {
            row = [
              studentResult.student.enrollmentNo,
              studentResult.student.fullName,
              studentResult.student.emailId || '-',
              'Absent',
              '-', '-', '-',
              gradePoints, grade, 0, '', 0,
              ...questionStatuses
            ];
          }
          rows.push(row);
        }
      });
    });

    // Rest of Excel generation code remains the same...
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    const colWidths = [];
    for (let col = 0; col < headers.length; col++) {
      let maxWidth = 10;
      if (headers[col]) {
        maxWidth = Math.max(maxWidth, headers[col].length);
      }
      for (let row = 1; row < rows.length; row++) {
        if (rows[row][col]) {
          const cellValue = String(rows[row][col]);
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }
      colWidths.push({ width: Math.min(Math.max(maxWidth + 2, 12), 50) });
    }
    worksheet['!cols'] = colWidths;

    // Header styling
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { bgColor: { rgb: "366092" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) worksheet[cellRef] = {};
      worksheet[cellRef].s = headerStyle;
    }

    // Grade styling (only for non-demo exports)
    if (testType !== 'demo') {
      const failStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFF0000' }, bgColor: { rgb: 'FFFF0000' } },
        font: { color: { rgb: 'FFFFFFFF' }, bold: true }
      };
      const absentStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFF8000' }, bgColor: { rgb: 'FFFF8000' } },
        font: { color: { rgb: 'FFFFFFFF' }, bold: true }
      };

      const gradePointsCol = 7;
      const gradeCol = 8;

      for (let row = 1; row < rows.length; row++) {
        const gradeValue = rows[row][gradeCol];
        const style = gradeValue === 'F' ? failStyle : gradeValue === 'W' ? absentStyle : null;

        if (style) {
          [gradePointsCol, gradeCol].forEach(col => {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (!worksheet[cellRef]) {
              worksheet[cellRef] = { v: rows[row][col], t: 's' };
            }
            worksheet[cellRef].s = style;
          });
        }
      }
    }

    // Generate filename and sheet name
    let fileName;
    if (testType === 'demo') {
      fileName = `(Demo)_${report.course.courseCode}_${report.subject.subjectCode}_detailed_report.xlsx`;
    } else if (testType === 'official') {
      fileName = `${report.course.courseCode}_${report.subject.subjectCode}_detailed_report.xlsx`;
    } else {
      fileName = `${report.course.courseCode}_${report.subject.subjectCode}_combined_report.xlsx`;
    }

    const sheetName = testType === 'demo' ? 'Demo Report' :
      testType === 'official' ? 'Official Report' :
        `${report.subject.subjectCode} Report`;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };


  // Render loading state
  if (loading && courses.length === 0) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
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

        {/* Course Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Course and Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Course</label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.courseName} ({course.courseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={e => loadSubjectReport(e.target.value, selectedExamType)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={!selectedCourse}
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(subject => (
                    <option key={subject.subjectCode} value={subject.subjectCode}>
                      {subject.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Exam Type</label>
                <select
                  value={selectedExamType}
                  onChange={e => setSelectedExamType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={!selectedSubject}
                >
                  <option value="">-- Select Exam Type --</option>
                  <option value="official">Official</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading indicator for subject data */}
        {loading && selectedCourse && (
          <Card className="mb-6">
            <CardContent className="text-center py-8">
              <div className="text-lg">Loading report data...</div>
            </CardContent>
          </Card>
        )}

        {/* Error display */}
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Subject Report Display */}
        {selectedSubject && reportsBySubject[selectedSubject] && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                {reportsBySubject[selectedSubject].subject.subjectName}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Course: {reportsBySubject[selectedSubject].course.courseName} ({reportsBySubject[selectedSubject].course.courseCode})
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {reportsBySubject[selectedSubject].studentResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reportsBySubject[selectedSubject].tests.length}
                  </div>
                  <div className="text-sm text-gray-600">Tests</div>
                </div>
                {/* <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {getInternalMarksStats(reportsBySubject[selectedSubject]).percentage}%
                  </div>
                  <div className="text-sm text-gray-600">Internal Marks</div>
                </div> */}
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={() => exportToExcel(reportsBySubject[selectedSubject], 'official')}
                  variant="outline"
                  className="flex items-center"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Official
                </Button>

                <Button
                  onClick={() => exportToExcel(reportsBySubject[selectedSubject], 'demo')}
                  variant="outline"
                  className="flex items-center"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No data message */}
        {selectedSubject && !reportsBySubject[selectedSubject] && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No report data available for this subject.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Question Marking Modal */}
      {/* <QuestionMarkingModal
        isOpen={showQuestionMarking}
        onClose={() => {
          setShowQuestionMarking(false);
          setSelectedSubmissionForMarking(null);
        }}
        submissionData={selectedSubmissionForMarking}
      /> */}
    </div>
  );
};

export default Reports;
