import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../components/ui/dialog';
import { 
  Plus, 
  BookOpen, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Users,
  Calendar,
  X,
  GripVertical
} from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';

const CourseManager = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    courseName: '',
    courseCode: '',
    description: '',
    duration: '',
    subjects: []
  });
  const [newSubject, setNewSubject] = useState({
    subjectCode: '',
    subjectName: '',
    hasExternalExam: true // Default to true (has external exam)
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      courseName: '',
      courseCode: '',
      description: '',
      duration: '',
      subjects: []
    });
    setNewSubject({
      subjectCode: '',
      subjectName: '',
      hasExternalExam: true
    });
    setEditingCourse(null);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    if (!formData.courseName || !formData.courseCode || !formData.duration) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get form data with any pending subject added
      const finalFormData = addPendingSubjectIfExists();
      
      const response = await api.post('/courses', finalFormData);
      setCourses([response.data.course, ...courses]);
      toast.success('Course created successfully');
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error(error.response?.data?.message || 'Failed to create course');
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    
    if (!formData.courseName || !formData.courseCode || !formData.duration) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get form data with any pending subject added
      const finalFormData = addPendingSubjectIfExists();
      
      const response = await api.put(`/courses/${editingCourse._id}`, finalFormData);
      setCourses(courses.map(course => 
        course._id === editingCourse._id ? response.data.course : course
      ));
      toast.success('Course updated successfully');
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error(error.response?.data?.message || 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      await api.delete(`/courses/${courseId}`);
      setCourses(courses.filter(course => course._id !== courseId));
      toast.success('Course deleted successfully');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setFormData({
      courseName: course.courseName,
      courseCode: course.courseCode,
      description: course.description || '',
      duration: course.duration,
      subjects: course.subjects.map(subject => ({
        ...subject,
        hasExternalExam: subject.hasExternalExam !== undefined ? subject.hasExternalExam : true
      }))
    });
    setShowCreateDialog(true);
  };

  const addSubjectToForm = () => {
    if (!newSubject.subjectCode || !newSubject.subjectName) {
      toast.error('Please fill in both subject code and name');
      return;
    }

    // Check for duplicate subject codes
    const isDuplicate = formData.subjects.some(
      subject => subject.subjectCode.toLowerCase() === newSubject.subjectCode.toLowerCase()
    );

    if (isDuplicate) {
      toast.error('Subject code already exists');
      return;
    }

    setFormData({
      ...formData,
      subjects: [...formData.subjects, {
        subjectCode: newSubject.subjectCode.toUpperCase(),
        subjectName: newSubject.subjectName,
        hasExternalExam: newSubject.hasExternalExam
      }]
    });

    setNewSubject({
      subjectCode: '',
      subjectName: '',
      hasExternalExam: true
    });
  };

  // Helper function to add pending subject input if exists
  const addPendingSubjectIfExists = () => {
    if (newSubject.subjectCode.trim() && newSubject.subjectName.trim()) {
      // Check for duplicate subject codes
      const isDuplicate = formData.subjects.some(
        subject => subject.subjectCode.toLowerCase() === newSubject.subjectCode.toLowerCase()
      );

      if (!isDuplicate) {
        return {
          ...formData,
          subjects: [...formData.subjects, {
            subjectCode: newSubject.subjectCode.toUpperCase(),
            subjectName: newSubject.subjectName,
            hasExternalExam: newSubject.hasExternalExam
          }]
        };
      }
    }
    return formData;
  };

  const removeSubjectFromForm = (index) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((_, i) => i !== index)
    });
  };

  const moveSubjectUp = (index) => {
    if (index === 0) return; // Can't move first item up
    
    const newSubjects = [...formData.subjects];
    [newSubjects[index - 1], newSubjects[index]] = [newSubjects[index], newSubjects[index - 1]];
    
    setFormData({
      ...formData,
      subjects: newSubjects
    });
  };

  const moveSubjectDown = (index) => {
    if (index === formData.subjects.length - 1) return; // Can't move last item down
    
    const newSubjects = [...formData.subjects];
    [newSubjects[index], newSubjects[index + 1]] = [newSubjects[index + 1], newSubjects[index]];
    
    setFormData({
      ...formData,
      subjects: newSubjects
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
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Management</h1>
                <p className="mt-1 text-sm text-gray-600">Create and manage courses with subjects</p>
              </div>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? 'Edit Course' : 'Create New Course'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCourse ? 'Update course information and subjects' : 'Add a new course with subjects'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="courseName">Course Name *</Label>
                      <Input
                        id="courseName"
                        value={formData.courseName}
                        onChange={(e) => setFormData({...formData, courseName: e.target.value})}
                        placeholder="e.g., Computer Science Engineering"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="courseCode">Course Code *</Label>
                      <Input
                        id="courseCode"
                        value={formData.courseCode}
                        onChange={(e) => setFormData({...formData, courseCode: e.target.value.toUpperCase()})}
                        placeholder="e.g., CSE"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration *</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      placeholder="e.g., 4 years"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Course description..."
                      rows={3}
                    />
                  </div>

                  {/* Subjects Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Subjects</Label>
                    
                    {/* Add Subject Form */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <Input
                        placeholder="Subject Code (e.g., CS101)"
                        value={newSubject.subjectCode}
                        onChange={(e) => setNewSubject({...newSubject, subjectCode: e.target.value.toUpperCase()})}
                      />
                      <Input
                        placeholder="Subject Name (e.g., Programming Fundamentals)"
                        value={newSubject.subjectName}
                        onChange={(e) => setNewSubject({...newSubject, subjectName: e.target.value})}
                      />
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={newSubject.hasExternalExam}
                          onChange={e => setNewSubject({...newSubject, hasExternalExam: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span>Has External Exam</span>
                      </label>
                      <Button type="button" onClick={addSubjectToForm} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Subjects List */}
                    {formData.subjects.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {formData.subjects.map((subject, index) => (
                          <div key={index} className="group flex items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border transition-all duration-200">
                            {/* Drag Handle */}
                            <div className="flex flex-col items-center mr-3 cursor-move opacity-50 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>
                            
                            {/* Subject Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">{subject.subjectCode}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${subject.hasExternalExam !== false ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {subject.hasExternalExam !== false ? 'External Exam' : 'No External Exam'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">{subject.subjectName}</div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Move Up/Down with subtle styling */}
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveSubjectUp(index)}
                                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}
                              
                              {index < formData.subjects.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveSubjectDown(index)}
                                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => removeSubjectFromForm(index)}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remove subject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCourse ? 'Update Course' : 'Create Course'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Courses Grid */}
          {courses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">No courses yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create your first course to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{course.courseName}</CardTitle>
                        <CardDescription className="mt-1">
                          <Badge variant="secondary">{course.courseCode}</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCourse(course)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCourse(course._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {course.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Duration: {course.duration}</span>
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Subjects: {course.subjects.length}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>Created by: {course.createdBy?.name}</span>
                      </div>
                    </div>

                    {course.subjects.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-xs font-medium text-gray-700">Subjects:</Label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {course.subjects.slice(0, 3).map((subject) => (
                            <Badge key={subject._id} variant="outline" className="text-xs">
                              {subject.subjectCode}
                            </Badge>
                          ))}
                          {course.subjects.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{course.subjects.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
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

export default CourseManager;
