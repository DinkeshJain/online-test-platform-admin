import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // Check if user is admin after successful login
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData?.role !== 'admin') {
        setError('Only admin accounts can access this portal. Please use student login.');
        setLoading(false);
        return;
      }
      
      toast.success('Admin login successful!');
      navigate('/admin/dashboard');
    } else {
      setError(result.message);
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border border-gray-300 overflow-hidden">
          <CardHeader className="text-center pb-3 bg-white">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Shield className="h-8 w-8 text-gray-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
                <span className="text-gray-800">Acharya Nagarjuna University</span>
                <br />
                <span className="text-gray-600 text-sm"> in collaboration with </span>
                <br />
                <span className="text-gray-800">National Institute of Fire and Safety</span>
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm font-medium">
                Administrative Portal - Secure Login
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Admin Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter admin username"
                    className="pl-10 h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="pl-10 h-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-10 text-sm bg-gray-800 hover:bg-gray-900 mt-4">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Admin Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;

