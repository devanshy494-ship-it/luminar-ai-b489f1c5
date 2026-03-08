import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowLeft, CheckCircle2, Circle, Sparkles, Target, Loader2, ChevronDown, ChevronUp, GraduationCap, Lightbulb, Search, Plus, Layers } from 'lucide-react';
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

interface LessonData {
  sections: { heading: string; content: string }[];
  keyTakeaways: string[];
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
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Record<number, LessonData>>({});
  const [loadingLesson, setLoadingLesson] = useState<number | null>(null);
  const [generatingStepFlashcards, setGeneratingStepFlashcards] = useState<number | null>(null);
  const [generatingStepQuiz, setGeneratingStepQuiz] = useState<number | null>(null);
  const [deepDiveStep, setDeepDiveStep] = useState<number | null>(null);
  const [deepDiveQuery, setDeepDiveQuery] = useState('');
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [generatingOverallQuiz, setGeneratingOverallQuiz] = useState(false);
  const [flashcardCount, setFlashcardCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (!topicId || !user) return;
      const [topicRes, roadmapRes, flashcardRes] = await Promise.all([
        supabase.from('topics').select('*').eq('id', topicId).single(),
        supabase.from('roadmaps').select('*').eq('topic_id', topicId).single(),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('topic_id', topicId),
      ]);
      if (topicRes.data) setTopic(topicRes.data);
      if (roadmapRes.data) setRoadmap(roadmapRes.data);
      setFlashcardCount(flashcardRes.count || 0);
      setLoading(false);
    }
    fetchData();
  }, [topicId, user]);

  const toggleStep = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!roadmap) return;
    const newSteps = [...roadmap.steps];
    newSteps[index].completed = !newSteps[index].completed;
    const completedCount = newSteps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / newSteps.length) * 100);
    setRoadmap({ ...roadmap, steps: newSteps, progress });
    await supabase.from('roadmaps').update({ steps: newSteps, progress }).eq('id', roadmap.id);
  };

  const handleExpandStep = async (index: number) => {
    if (expandedStep === index) {
      setExpandedStep(null);
      return;
    }
    setExpandedStep(index);
    if (!lessons[index] && roadmap && topic) {
      setLoadingLesson(index);
      try {
        const step = roadmap.steps[index];
        const { data, error } = await supabase.functions.invoke('generate-lesson', {
          body: { topicTitle: topic.title, stepTitle: step.title, stepDescription: step.description },
        });
        if (error) throw error;
        if (data?.error) { toast.error(data.error); return; }
        setLessons((prev) => ({ ...prev, [index]: data }));
      } catch (e: any) {
        toast.error(e?.message || 'Failed to generate lesson');
        setExpandedStep(null);
      } finally {
        setLoadingLesson(null);
      }
    }
  };

  const handleStepFlashcards = async (stepIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!topic) return;
    setGeneratingStepFlashcards(stepIndex);
    try {
      const step = roadmap!.steps[stepIndex];
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { topicId, stepIndex, stepTitle: step.title },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setFlashcardCount((c) => c + (data.flashcards?.length || 0));
      toast.success(`Flashcards generated for "${step.title}"!`);
      navigate(`/flashcards/${topicId}?step=${stepIndex}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate flashcards');
    } finally {
      setGeneratingStepFlashcards(null);
    }
  };

  const handleStepQuiz = async (stepIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!topic) return;
    setGeneratingStepQuiz(stepIndex);
    try {
      const step = roadmap!.steps[stepIndex];
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topicId, stepIndex, stepTitle: step.title },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success('Quiz generated!');
      navigate(`/quiz/${topicId}`, {
        state: { questions: data.questions, topicTitle: data.topicTitle, stepIndex, stepTitle: step.title },
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate quiz');
    } finally {
      setGeneratingStepQuiz(null);
    }
  };

  const handleOverallQuiz = async () => {
    if (!topic) return;
    setGeneratingOverallQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topicId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success('Overall quiz generated!');
      navigate(`/quiz/${topicId}`, {
        state: { questions: data.questions, topicTitle: data.topicTitle },
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate quiz');
    } finally {
      setGeneratingOverallQuiz(false);
    }
  };

  const handleDeepDive = async (stepIndex: number) => {
    if (!deepDiveQuery.trim() || !topic || !roadmap) return;
    setLoadingDeepDive(true);
    try {
      const step = roadmap.steps[stepIndex];
      // Pass existing headings so AI doesn't repeat content
      const existingHeadings = lessons[stepIndex]?.sections.map((s) => s.heading) || [];
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: {
          topicTitle: topic.title,
          stepTitle: `${step.title} — Deep Dive: ${deepDiveQuery.trim()}`,
          stepDescription: `The learner wants to explore "${deepDiveQuery.trim()}" in more depth within the context of "${step.title}" (part of "${topic.title}"). IMPORTANT: Do NOT repeat or cover any of these already-covered topics: ${existingHeadings.join(', ')}. Only provide NEW content about "${deepDiveQuery.trim()}".`,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      // Replace deep dive content — only show the deep dive result, not append to original
      setLessons((prev) => {
        const existing = prev[stepIndex];
        if (!existing) return { ...prev, [stepIndex]: data };
        return {
          ...prev,
          [stepIndex]: {
            sections: [...existing.sections, { heading: `🔍 Deep Dive: ${deepDiveQuery.trim()}`, content: '---' }, ...data.sections],
            keyTakeaways: [...existing.keyTakeaways, ...data.keyTakeaways],
          },
        };
      });
      setDeepDiveQuery('');
      setDeepDiveStep(null);
      toast.success('Deep dive content added!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate deep dive');
    } finally {
      setLoadingDeepDive(false);
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{topic.title}</h1>
          <p className="text-muted-foreground mb-4">Click on any step to study the lesson</p>

          {/* Topic-level actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleOverallQuiz} disabled={generatingOverallQuiz} variant="default" size="sm">
              {generatingOverallQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
              Take Full Quiz
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/flashcards/${topicId}`)} disabled={flashcardCount === 0}>
              <Layers className="h-4 w-4 mr-2" />
              View Flashcards {flashcardCount > 0 && `(${flashcardCount})`}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{roadmap.progress}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${roadmap.progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {roadmap.steps.map((step, i) => (
              <motion.div
                key={i}
                className={`rounded-xl border transition-all ${step.completed ? 'bg-primary/5 border-primary/20' : 'bg-card border-border hover:border-primary/20'}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <div className="p-6 cursor-pointer" onClick={() => handleExpandStep(i)}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5" onClick={(e) => toggleStep(i, e)}>
                      {step.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold font-serif text-lg ${step.completed ? 'text-primary' : 'text-foreground'}`}>
                          Step {i + 1}: {step.title}
                        </h3>
                        {expandedStep === i ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                      {step.resources && step.resources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {step.resources.map((r, ri) => (
                            <span key={ri} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedStep === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="px-6 pb-6 border-t border-border/50 pt-6 ml-10">
                        {/* Step-level actions */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          <Button variant="outline" size="sm" onClick={(e) => handleStepFlashcards(i, e)} disabled={generatingStepFlashcards === i}>
                            {generatingStepFlashcards === i ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                            Flashcards
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => handleStepQuiz(i, e)} disabled={generatingStepQuiz === i}>
                            {generatingStepQuiz === i ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Target className="h-3 w-3 mr-1" />}
                            Quiz
                          </Button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeepDiveStep(deepDiveStep === i ? null : i); }}
                            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                            title="Deep dive into a sub-topic"
                          >
                            <Search className="h-3.5 w-3.5 text-primary" />
                          </button>
                        </div>

                        {/* Deep dive input */}
                        <AnimatePresence>
                          {deepDiveStep === i && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={deepDiveQuery}
                                  onChange={(e) => setDeepDiveQuery(e.target.value)}
                                  placeholder="Enter a sub-topic to dive deeper into..."
                                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  onKeyDown={(e) => e.key === 'Enter' && handleDeepDive(i)}
                                />
                                <Button size="sm" onClick={() => handleDeepDive(i)} disabled={loadingDeepDive || !deepDiveQuery.trim()}>
                                  {loadingDeepDive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Lesson content */}
                        {loadingLesson === i ? (
                          <div className="flex flex-col items-center py-8">
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                            <p className="text-muted-foreground">Generating lesson content...</p>
                          </div>
                        ) : lessons[i] ? (
                          <div className="space-y-6">
                            {lessons[i].sections.map((section, si) => (
                              <div key={si}>
                                <h4 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 text-primary" />
                                  {section.heading}
                                </h4>
                                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{section.content}</div>
                              </div>
                            ))}
                            {lessons[i].keyTakeaways && lessons[i].keyTakeaways.length > 0 && (
                              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-primary" /> Key Takeaways
                                </h4>
                                <ul className="space-y-2">
                                  {lessons[i].keyTakeaways.map((takeaway, ti) => (
                                    <li key={ti} className="text-sm text-foreground/80 flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                      {takeaway}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {!step.completed && (
                              <Button variant="outline" size="sm" onClick={(e) => toggleStep(i, e)} className="mt-2">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Complete
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Bottom sections: Overall Quiz & All Flashcards */}
          <div className="mt-12 space-y-4">
            {/* Overall Quiz */}
            <motion.div
              className="rounded-xl border border-border bg-card p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: roadmap.steps.length * 0.05 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-serif text-lg text-foreground">Overall Quiz</h3>
                    <p className="text-sm text-muted-foreground">Test your knowledge across all steps</p>
                  </div>
                </div>
                <Button onClick={handleOverallQuiz} disabled={generatingOverallQuiz}>
                  {generatingOverallQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
                  Take Quiz
                </Button>
              </div>
            </motion.div>

            {/* All Flashcards */}
            <motion.div
              className="rounded-xl border border-border bg-card p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: roadmap.steps.length * 0.05 + 0.05 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-serif text-lg text-foreground">All Flashcards</h3>
                    <p className="text-sm text-muted-foreground">
                      {flashcardCount > 0
                        ? `${flashcardCount} cards compiled from all steps`
                        : 'Generate flashcards from any step above first'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/flashcards/${topicId}`)}
                  disabled={flashcardCount === 0}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  View All Cards
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
