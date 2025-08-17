import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ClipboardCheck, Plus, Edit, Trash2, ArrowLeft, Home } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import api from '../lib/api';
import toast from 'react-hot-toast';

const EvaluatorManagement = () => {
  const navigate = useNavigate();
  const [evaluators, setEvaluators] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEvaluator, setEditingEvaluator] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    assignedCourses: [],
    assignedSubjects: []
  });

  useEffect(() => {
    fetchEvaluators();
    fetchCourses();
  }, []);

  const fetchEvaluators = async () => {
    try {
      const response = await api.get('/evaluators');
      setEvaluators(response.data.evaluators);
    } catch (error) {
      console.error('Error fetching evaluators:', error);
      setError('Failed to load evaluators');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCourseSelection = (courseId) => {
    setFormData(prev => ({
      ...prev,
      assignedCourses: prev.assignedCourses.includes(courseId)
        ? prev.assignedCourses.filter(id => id !== courseId)
        : [...prev.assignedCourses, courseId]
    }));
  };

  const handleSubjectSelection = (courseId, subjectCode, subjectName) => {
    const subjectKey = `${courseId}-${subjectCode}`;
    setFormData(prev => {
      const existingIndex = prev.assignedSubjects.findIndex(
        s => s.courseId === courseId && s.subjectCode === subjectCode
      );
      
      if (existingIndex >= 0) {
        // Remove subject
        return {
          ...prev,
          assignedSubjects: prev.assignedSubjects.filter((_, index) => index !== existingIndex)
        };
      } else {
        // Add subject
        return {
          ...prev,
          assignedSubjects: [...prev.assignedSubjects, { courseId, subjectCode, subjectName }]
        };
      }
    });
  };

  const handleCreateEvaluator = async (e) => {
    e.preventDefault();
    try {
      await api.post('/evaluators', formData);
      toast.success('Evaluator created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchEvaluators();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create evaluator');
    }
  };

  const handleEditEvaluator = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/evaluators/${editingEvaluator._id}`, {
        name: formData.name,
        email: formData.email,
        assignedSubjects: formData.assignedSubjects
      });
      toast.success('Evaluator updated successfully');
      closeEditDialog();
      fetchEvaluators();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update evaluator');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      assignedCourses: [],
      assignedSubjects: []
    });
  };

  const openEditDialog = (evaluator) => {
    setEditingEvaluator(evaluator);
    setFormData({
      name: evaluator.name || '',
      username: evaluator.username || '',
      email: evaluator.email || '',
      password: '',
      assignedCourses: evaluator.assignedCourses || [],
      assignedSubjects: evaluator.assignedSubjects || []
    });
    setShowEditDialog(true);
  };

  const closeEditDialog = () => {
    setShowEditDialog(false);
    setEditingEvaluator(null);
    resetForm();
  };

  const handleDeleteEvaluator = async (evaluatorId) => {
    if (window.confirm('Are you sure you want to permanently delete this evaluator? This action cannot be undone.')) {
      try {
        await api.delete(`/evaluators/${evaluatorId}`);
        toast.success('Evaluator deleted successfully');
        fetchEvaluators();
      } catch (error) {
        toast.error('Failed to delete evaluator');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluators...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
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
            
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">Evaluator Management</span>
            </nav>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Evaluator Management</h1>
              <p className="text-gray-600">Manage evaluators and their subject assignments</p>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Evaluator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Evaluator</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvaluator} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-lg font-semibold">Assign Subjects</Label>
                    <div className="mt-2 space-y-4">
                      {courses.map(course => (
                        <div key={course._id} className="border rounded p-4">
                          <h4 className="font-semibold mb-2">
                            {course.courseName} ({course.courseCode})
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {course.subjects.map(subject => (
                              <label key={subject._id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.assignedSubjects.some(
                                    s => s.courseId === course._id && s.subjectCode === subject.subjectCode
                                  )}
                                  onChange={() => handleSubjectSelection(
                                    course._id, 
                                    subject.subjectCode, 
                                    subject.subjectName
                                  )}
                                />
                                <span className="text-sm">
                                  {subject.subjectName} ({subject.subjectCode})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateDialog(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Evaluator</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Evaluator Dialog */}
            <Dialog open={showEditDialog} onOpenChange={(open) => {
              if (!open) closeEditDialog();
            }}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Evaluator</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditEvaluator} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-username">Username</Label>
                      <Input
                        id="edit-username"
                        name="username"
                        value={formData.username}
                        disabled
                        className="bg-gray-100"
                        title="Username cannot be changed"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <strong>Note:</strong> Username and password cannot be changed through this form. To change a password, the evaluator should reset it through the login page.
                  </div>

                  <div>
                    <Label className="text-lg font-semibold">Assign Subjects</Label>
                    <div className="mt-2 space-y-4">
                      {courses.map(course => (
                        <div key={course._id} className="border rounded p-4">
                          <h4 className="font-semibold mb-2">
                            {course.courseName} ({course.courseCode})
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {course.subjects.map(subject => (
                              <label key={subject._id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.assignedSubjects.some(
                                    s => s.courseId === course._id && s.subjectCode === subject.subjectCode
                                  )}
                                  onChange={() => handleSubjectSelection(
                                    course._id, 
                                    subject.subjectCode, 
                                    subject.subjectName
                                  )}
                                />
                                <span className="text-sm">
                                  {subject.subjectName} ({subject.subjectCode})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={closeEditDialog}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Update Evaluator</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Evaluators List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {evaluators.map(evaluator => (
            <Card key={evaluator._id} className={!evaluator.isActive ? 'opacity-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{evaluator.name}</h3>
                    <p className="text-sm text-gray-600">@{evaluator.username}</p>
                    <p className="text-sm text-gray-600">{evaluator.email}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(evaluator)}
                      disabled={!evaluator.isActive}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvaluator(evaluator._id)}
                      disabled={!evaluator.isActive}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Assigned Subjects:</h4>
                    {evaluator.assignedSubjects.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {evaluator.assignedSubjects.map((subject, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {subject.subjectName} ({subject.subjectCode})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No subjects assigned</p>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Status:</span>
                    <span className={evaluator.isActive ? 'text-green-600' : 'text-red-600'}>
                      {evaluator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Created:</span>
                    <span>{new Date(evaluator.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {evaluators.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Evaluators Found</h3>
              <p className="text-gray-600">
                Create your first evaluator to start managing internal marks evaluation.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EvaluatorManagement;
