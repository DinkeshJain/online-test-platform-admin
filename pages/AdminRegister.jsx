import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Shield, User } from 'lucide-react';

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { registerAdmin } = useAuth();
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

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    const result = await registerAdmin(formData.name, formData.username);
    
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-lg border border-gray-300 overflow-hidden">
          <CardHeader className="text-center pb-6 bg-white">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Shield className="h-10 w-10 text-gray-600" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                <span className="text-gray-800">Acharya Nagarjuna University</span>
                <br />
                <span className="text-gray-600 text-lg"> in collaboration with </span>
                <br />
                <span className="text-gray-800">National Institute of Fire and Safety</span>
              </CardTitle>
              <CardDescription className="text-gray-600 text-base font-medium">
                Admin Registration Portal
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Your password will be automatically set to your username. 
                  You can change it after logging in.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 text-base bg-gray-900 hover:bg-gray-800">
                {loading ? 'Creating account...' : 'Create Admin Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link to="/admin/login" className="text-gray-600 hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRegister;
