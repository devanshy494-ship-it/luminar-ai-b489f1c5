import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, CheckCircle2, Circle, Clock, Sparkles, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Step {
  title: string;
  description: string;
  estimatedTime: string;
  resources?: string[];
  completed: boolean;
  order: number;
}

interface RoadmapData {
  id: string;
  topic_id: string;
  steps: Step[];
  progress: number;
}

interface TopicData {
  id: string;
  title: string;
}

export default function Roadmap() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!topicId || !user) return;

      const [topicRes, roadmapRes] = await Promise.all([
        supabase.from('topics').select('*').eq('id', topicId).single(),
        supabase.from('roadmaps').select('*').eq('topic_id', topicId).single(),
      ]);

      if (topicRes.data) setTopic(topicRes.data);
      if (roadmapRes.data) setRoadmap(roadmapRes.data);
      setLoading(false);
    }
    fetchData();
  }, [topicId, user]);

  const toggleStep = async (index: number) => {
    if (!roadmap) return;
    const newSteps = [...roadmap.steps];
    newSteps[index].completed = !newSteps[index].completed;
    const completedCount = newSteps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / newSteps.length) * 100);

    setRoadmap({ ...roadmap, steps: newSteps, progress });

    await supabase
      .from('roadmaps')
      .update({ steps: newSteps, progress })
      .eq('id', roadmap.id);
  };

  const handleGenerateFlashcards = async () => {
    setGeneratingFlashcards(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { topicId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success('Flashcards generated!');
      navigate(`/flashcards/${topicId}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate flashcards');
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topicId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success('Quiz generated!');
      navigate(`/quiz/${topicId}`, { state: { questions: data.questions, topicTitle: data.topicTitle } });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!roadmap || !topic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Roadmap not found</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

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

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{topic.title}</h1>
          <p className="text-muted-foreground mb-6">Your personalized learning roadmap</p>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{roadmap.progress}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${roadmap.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-10">
            <Button
              variant="outline"
              onClick={handleGenerateFlashcards}
              disabled={generatingFlashcards}
            >
              {generatingFlashcards ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Flashcards
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateQuiz}
              disabled={generatingQuiz}
            >
              {generatingQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
              Take Quiz
            </Button>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {roadmap.steps.map((step, i) => (
              <motion.div
                key={i}
                className={`p-6 rounded-xl border transition-all cursor-pointer ${
                  step.completed
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border hover:border-primary/20'
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => toggleStep(i)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold font-serif text-lg ${step.completed ? 'text-primary' : 'text-foreground'}`}>
                        Step {i + 1}: {step.title}
                      </h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {step.estimatedTime}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    {step.resources && step.resources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.resources.map((r, ri) => (
                          <span key={ri} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
