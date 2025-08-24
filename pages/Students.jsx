import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Upload, Search, Filter, Download, Eye, Users, FileText, Loader2, Edit, User, Trash2, ClipboardList } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, selectedCourse]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsResponse, coursesResponse] = await Promise.all([
        api.get('/bulk/students/all'),
        api.get('/courses')
      ]);
      setStudents(studentsResponse.data.students || []);
      setCourses(coursesResponse.data.courses || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error response:', error.response);
      // Try to fetch courses separately if the combined call fails
      try {
        const coursesResponse = await api.get('/courses');
        setCourses(coursesResponse.data.courses || []);
      } catch (coursesError) {
        console.error('Error fetching courses separately:', coursesError);
        // Set some default courses if API fails
        setCourses([
          { _id: '1', name: 'Computer Science' },
          { _id: '2', name: 'Information Technology' },
          { _id: '3', name: 'Electronics' },
          { _id: '4', name: 'Mechanical' },
          { _id: '5', name: 'Civil' }
        ]);
      }

      if (error.response?.status === 404) {
        // If endpoint doesn't exist, show empty state
        setStudents([]);
      } else {
        toast.error('Failed to load students data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.enrollmentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fatherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.batchYear?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by course
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(student => student.course === selectedCourse);
    }

    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleUploadClick = () => {
    navigate('/bulk-upload');
  };

  const handleViewAttendance = () => {
    navigate('/attendance');
  };

  const handleExportData = async () => {
    try {
      const response = await api.get('/bulk/students/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_data.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Students data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export students data');
    }
  };

  // Pagination logic
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleEditStudent = (studentId) => {
    const student = students.find(s => s._id === studentId);
    if (student) {
      // Format dates properly
      let formattedDateOfBirth = '';
      if (student.dateOfBirth) {
        try {
          const dob = new Date(student.dateOfBirth);
          if (dob.getFullYear() > 1900) { // Only format if it's a valid date
            formattedDateOfBirth = dob.toISOString().split('T')[0];
          }
        } catch (e) {
          console.log('Error formatting date of birth:', e);
        }
      }

      let formattedAdmissionDate = '';
      if (student.admissionDate) {
        try {
          const admDate = new Date(student.admissionDate);
          if (admDate.getFullYear() > 1900) { // Only format if it's a valid date
            formattedAdmissionDate = admDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.log('Error formatting admission date:', e);
        }
      }

      // Find the full course name from the course code
      let courseName = student.course || '';
      if (student.course && courses.length > 0) {
        // Try to find course by code first
        const foundCourse = courses.find(course =>
          course.courseCode === student.course || course.courseName === student.course
        );
        if (foundCourse) {
          courseName = foundCourse.courseName;
        }
      }

      setEditingStudent(student);
      setEditFormData({
        fullName: student.fullName || '',
        enrollmentNo: student.enrollmentNo || '',
        batchYear: student.batchYear || '',
        course: courseName,
        username: student.username || '',
        emailId: student.emailId || '',
        mobileNo: student.mobileNo || '',
        gender: student.gender || '',
        dateOfBirth: formattedDateOfBirth,
        admissionDate: formattedAdmissionDate,
        address: student.addressLine1 || '',
        fatherName: student.fatherName || '',
        motherName: student.motherName || ''
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    try {
      setIsUpdating(true);
      const response = await api.put(`/bulk/students/${editingStudent._id}`, editFormData);

      if (response.data.success) {
        // Update the students list immediately
        setStudents(prev => prev.map(student =>
          student._id === editingStudent._id
            ? { ...student, ...editFormData }
            : student
        ));

        setIsEditDialogOpen(false);
        setEditingStudent(null);
        setEditFormData({});
        toast.success('Student updated successfully');
      } else {
        toast.error(response.data.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      const response = await api.delete(`/bulk/students/${studentId}`);

      if (response.data.success) {
        // Remove the student from the list
        setStudents(prev => prev.filter(student => student._id !== studentId));
        toast.success('Student deleted successfully');
      } else {
        toast.error(response.data.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCourseName = (courseCode) => {
    const course = courses.find(c => c.courseCode === courseCode);
    return course ? course.courseName : courseCode;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students Management
                </CardTitle>
                <CardDescription>
                  Manage and view all registered students
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleUploadClick}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Students
                </Button>
                <Button
                  onClick={handleViewAttendance}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  View Attendance
                </Button>
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, enrollment number, father's name, or batch year..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course.courseCode}>
                        {course.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing {filteredStudents.length} of {students.length} students
                {selectedCourse !== 'all' && ` in ${getCourseName(selectedCourse)}`}
              </p>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                <p className="text-gray-500 mb-4">
                  {students.length === 0
                    ? "Get started by uploading student data."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {students.length === 0 && (
                  <Button onClick={handleUploadClick} className="flex items-center gap-2 mx-auto">
                    <Upload className="h-4 w-4" />
                    Upload Students
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father's Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStudents.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {student.photoPath ? (
                                <img
                                  src={`/uploads/${student.photoPath}`}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <User className="h-6 w-6 text-gray-400" />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.fatherName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">{student.enrollmentNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">{student.batchYear || 'N/A'}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{getCourseName(student.course)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStudent(student._id)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {student.name}? This action cannot be undone and will also delete all associated submissions and internal marks.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteStudent(student._id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                        <Button
                          key={number}
                          variant={currentPage === number ? "default" : "outline"}
                          size="sm"
                          onClick={() => paginate(number)}
                          className="w-8"
                        >
                          {number}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Make changes to student information here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={editFormData.fullName || ''}
                onChange={(e) => handleEditFormChange('fullName', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="enrollmentNo" className="text-right">
                Enrollment No
              </Label>
              <Input
                id="enrollmentNo"
                value={editFormData.enrollmentNo || ''}
                onChange={(e) => handleEditFormChange('enrollmentNo', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emailId" className="text-right">
                Email
              </Label>
              <Input
                id="emailId"
                type="email"
                value={editFormData.emailId || ''}
                onChange={(e) => handleEditFormChange('emailId', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobileNo" className="text-right">
                Mobile
              </Label>
              <Input
                id="mobileNo"
                value={editFormData.mobileNo || ''}
                onChange={(e) => handleEditFormChange('mobileNo', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fatherName" className="text-right">
                Father's Name
              </Label>
              <Input
                id="fatherName"
                value={editFormData.fatherName || ''}
                onChange={(e) => handleEditFormChange('fatherName', e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleUpdateStudent}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;