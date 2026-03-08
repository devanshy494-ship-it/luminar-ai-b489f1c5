import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

export default function Auth() {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { quickSignIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const { error } = await quickSignIn(fullName.trim());
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Welcome, ${fullName.trim()}!`);
        navigate('/dashboard');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative aurora-bg">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        {/* Aurora effect on left panel */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/10 blur-[60px]" />
        <div className="absolute inset-0 grid-overlay" />
        
        <motion.div
          className="max-w-md text-center relative z-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 neon-glow">
            <BookOpen className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">
            Your learning journey{' '}
            <span className="gradient-text">starts here</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            AI-powered roadmaps, flashcards, and quizzes — all tailored to you.
          </p>
        </motion.div>
      </div>

      {/* Right panel — name input */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="mb-8 text-muted-foreground"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
          </Button>

          <div className="p-8 rounded-2xl glass-card border border-border/50">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2 font-heading">
                What's your <span className="gradient-text">name</span>?
              </h1>
              <p className="text-muted-foreground">
                Enter your name to start learning with Luminar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 focus:border-primary/50 focus:ring-primary/30"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" variant="glow" className="w-full py-5" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Learning
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}