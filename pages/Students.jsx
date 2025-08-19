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

// Get the server base URL for static assets
// Automatically use local server if available, otherwise use remote
// Prefer localhost if available, then VITE_API_URL, then remote
function isLocalhostAvailable(url) {
  // Try to ping localhost synchronously (not recommended for production, but fine for dev)
  const xhr = new XMLHttpRequest();
  try {
    xhr.open('GET', url + '/health', false); // Assumes /health endpoint exists
    xhr.send(null);
    return xhr.status >= 200 && xhr.status < 400;
  } catch (e) {
    return false;
  }
}

let SERVER_BASE_URL = 'https://online-test-platform-server-1q1h.onrender.com';
const localUrl = 'http://localhost:5000'; // Change port if needed
if (isLocalhostAvailable(localUrl)) {
  SERVER_BASE_URL = localUrl;
} else if (import.meta.env.VITE_API_URL) {
  SERVER_BASE_URL = import.meta.env.VITE_API_URL.replace('/api', '');
}

import { 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Users,
  FileText,
  Loader2,
  Edit,
  User,
  Trash2
} from 'lucide-react';
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
    navigate('/admin/bulk-upload');
  };

  const handleExportData = async () => {
    try {
      const response = await api.get('/bulk/students/export', {
        responseType: 'blob'
      });
      
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
          course.courseCode === student.course || 
          course.courseName === student.course
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
        setStudents(prev =>
          prev.map(student =>
            student._id === editingStudent._id
              ? { ...student, ...editFormData }
              : student
          )
        );
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading students...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Students</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and view all registered students
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleExportData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button
                onClick={handleUploadClick}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Students
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredStudents.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
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
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course.courseCode}>
                      {course.courseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Students List</CardTitle>
            <CardDescription>
              {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {students.length === 0 
                    ? "Get started by uploading student data."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {students.length === 0 && (
                  <div className="mt-6">
                    <Button onClick={handleUploadClick}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Students
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Photo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Father's Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enrollment Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batch Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStudents.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex-shrink-0 h-12 w-12">
                              {student.photoPath ? (
                                <img
                                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                                  src={`${SERVER_BASE_URL}/uploads/${student.photoPath}`}
                                  alt={student.name}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center ${student.photoPath ? 'hidden' : 'flex'}`}
                                style={{ display: student.photoPath ? 'none' : 'flex' }}
                              >
                                <User className="h-6 w-6 text-gray-400" />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {student.fatherName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.enrollmentNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.batchYear || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary">
                              {getCourseName(student.course)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
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
                                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {student.fullName}? This action cannot be undone.
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
                            </div>
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
                      Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} results
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
                      {[...Array(totalPages)].map((_, index) => (
                        <Button
                          key={index + 1}
                          variant={currentPage === index + 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => paginate(index + 1)}
                        >
                          {index + 1}
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

        {filteredStudents.length > 0 && (
          <Button
            variant="destructive"
            className="mb-4"
            onClick={async () => {
              if (!window.confirm(`Are you sure you want to delete all ${filteredStudents.length} filtered students? This action cannot be undone.`)) return;
              try {
                for (const student of filteredStudents) {
                  await api.delete(`/bulk/students/${student._id}`);
                }
                setStudents(prev => prev.filter(student => !filteredStudents.some(f => f._id === student._id)));
                toast.success('All filtered students deleted successfully');
              } catch (error) {
                toast.error('Failed to delete some students');
              }
            }}
          >
            Delete All
          </Button>
        )}
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={editFormData.fullName || ''}
                onChange={(e) => handleEditFormChange('fullName', e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="enrollmentNo">Enrollment Number *</Label>
              <Input
                id="enrollmentNo"
                value={editFormData.enrollmentNo || ''}
                onChange={(e) => handleEditFormChange('enrollmentNo', e.target.value)}
                placeholder="Enter enrollment number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={editFormData.username || ''}
                onChange={(e) => handleEditFormChange('username', e.target.value)}
                placeholder="Enter username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailId">Email</Label>
              <Input
                id="emailId"
                type="email"
                value={editFormData.emailId || ''}
                onChange={(e) => handleEditFormChange('emailId', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mobileNo">Mobile Number</Label>
              <Input
                id="mobileNo"
                value={editFormData.mobileNo || ''}
                onChange={(e) => handleEditFormChange('mobileNo', e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="batchYear">Batch Year *</Label>
              <Input
                id="batchYear"
                value={editFormData.batchYear || ''}
                onChange={(e) => handleEditFormChange('batchYear', e.target.value)}
                placeholder="Enter batch year"
              />
            </div>
            
            {/* Course Dropdown */}
            <div className="space-y-2 w-full flex flex-col mb-4">
              <Label htmlFor="course">Course *</Label>
              <Select 
                value={editFormData.course || ''} 
                onValueChange={(value) => handleEditFormChange('course', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <SelectItem value="" disabled>No courses available</SelectItem>
                  ) : (
                    courses.map((course) => (
                      <SelectItem key={course._id} value={course.courseName}>
                        {course.courseName}
                      </SelectItem>
                    )))
                  }
                </SelectContent>
              </Select>
            </div>
            
            {/* Gender Dropdown */}
            <div className="space-y-2 w-full flex flex-col mb-4">
              <Label htmlFor="gender">Gender *</Label>
              <Select 
                value={editFormData.gender || ''} 
                onValueChange={(value) => handleEditFormChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={editFormData.dateOfBirth || ''}
                onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date *</Label>
              <Input
                id="admissionDate"
                type="date"
                value={editFormData.admissionDate || ''}
                onChange={(e) => handleEditFormChange('admissionDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fatherName">Father's Name</Label>
              <Input
                id="fatherName"
                value={editFormData.fatherName || ''}
                onChange={(e) => handleEditFormChange('fatherName', e.target.value)}
                placeholder="Enter father's name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input
                id="motherName"
                value={editFormData.motherName || ''}
                onChange={(e) => handleEditFormChange('motherName', e.target.value)}
                placeholder="Enter mother's name"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editFormData.address || ''}
                onChange={(e) => handleEditFormChange('addressLine1', e.target.value)}
                placeholder="Enter complete address"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateStudent}
              disabled={isUpdating || !editFormData.fullName || !editFormData.enrollmentNo}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
