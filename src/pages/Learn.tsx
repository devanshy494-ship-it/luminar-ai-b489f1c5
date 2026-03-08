import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Brain, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const suggestions = [
  'Machine Learning Fundamentals',
  'JavaScript for Beginners',
  'Quantum Physics',
  'UX Design Principles',
  'Financial Investing',
  'World History',
];

export default function Learn() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async (topicText: string) => {
    const trimmed = topicText.trim();
    if (!trimmed) {
      toast.error('Please enter a topic');
      return;
    }
    if (trimmed.length > 200) {
      toast.error('Topic must be under 200 characters');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: { topic: trimmed },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Roadmap generated!');
      navigate(`/roadmap/${data.topicId}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold text-foreground">Luminar</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            What do you want to learn?
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter any topic and AI will create your personalized learning roadmap.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate(topic);
            }}
            className="flex gap-3 mb-10"
          >
            <Input
              placeholder="e.g. Machine Learning, Ancient Rome, Guitar..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="text-base py-6"
              disabled={loading}
              maxLength={200}
            />
            <Button type="submit" size="lg" className="px-6 py-6" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          </form>

          {loading && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Generating your learning roadmap...</p>
              <p className="text-muted-foreground text-sm mt-1">This may take a few seconds</p>
            </motion.div>
          )}

          {!loading && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Or try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setTopic(s);
                      handleGenerate(s);
                    }}
                    className="px-4 py-2 rounded-full bg-card border border-border text-sm text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
