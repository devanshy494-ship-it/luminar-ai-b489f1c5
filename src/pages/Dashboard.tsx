import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, ArrowRight, LogOut, Brain, Sparkles, Zap, Map, Trash2, RotateCcw, History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import FlashcardCreator from '@/components/FlashcardCreator';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Topic {
  id: string;
  title: string;
  created_at: string;
}

interface RoadmapWithTopic {
  id: string;
  progress: number;
  created_at: string;
  topics: { title: string } | null;
  topic_id: string;
}

interface FlashcardGroup {
  topic_id: string;
  topic_title: string;
  step_index: number | null;
  step_title: string;
  count: number;
  created_at: string;
}

interface QuizResult {
  id: string;
  topic_id: string;
  score: number;
  total: number;
  step_index: number | null;
  wrong_questions: any[];
  questions: any[];
  completed_at: string;
  topics: { title: string } | null;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapWithTopic[]>([]);
  const [flashcardGroups, setFlashcardGroups] = useState<FlashcardGroup[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const [loadingFlashcards, setLoadingFlashcards] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [activeTab, setActiveTab] = useState("roadmaps");
  const [highlightTab, setHighlightTab] = useState(false);

  const switchTabFromAction = (tab: string) => {
    setActiveTab(tab);
    setHighlightTab(true);
    setTimeout(() => setHighlightTab(false), 1200);
    setTimeout(() => document.getElementById('dashboard-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };
  const fetchAll = async () => {
    if (!user) return;

    supabase.from('topics').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { setTopics(data || []); setIsFirstVisit(!data || data.length === 0); setLoading(false); });

    supabase.from('roadmaps').select('id, progress, created_at, topic_id, topics(title)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setRoadmaps((data as any) || []); setLoadingRoadmaps(false); });

    supabase.from('flashcards').select('id, topic_id, step_index, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(async ({ data: flashcards }) => {
        if (!flashcards || flashcards.length === 0) { setFlashcardGroups([]); setLoadingFlashcards(false); return; }
        const topicIds = [...new Set(flashcards.map(f => f.topic_id))];
        const { data: topicData } = await supabase.from('topics').select('id, title').in('id', topicIds);
        const topicMap: Record<string, string> = {};
        topicData?.forEach(t => { topicMap[t.id] = t.title; });

        const { data: roadmapData } = await supabase.from('roadmaps').select('topic_id, steps').in('topic_id', topicIds);
        const stepsMap: Record<string, any[]> = {};
        roadmapData?.forEach(r => { stepsMap[r.topic_id] = r.steps as any[]; });

        const groups: Record<string, FlashcardGroup> = {};
        flashcards.forEach(fc => {
          const key = `${fc.topic_id}-${fc.step_index ?? 'all'}`;
          if (!groups[key]) {
            const steps = stepsMap[fc.topic_id];
            let stepTitle = 'All Steps';
            if (fc.step_index !== null && fc.step_index !== undefined && steps?.[fc.step_index]) {
              stepTitle = steps[fc.step_index].title;
            }
            groups[key] = { topic_id: fc.topic_id, topic_title: topicMap[fc.topic_id] || 'Unknown', step_index: fc.step_index, step_title: stepTitle, count: 0, created_at: fc.created_at };
          }
          groups[key].count++;
        });
        setFlashcardGroups(Object.values(groups));
        setLoadingFlashcards(false);
      });

    supabase.from('quiz_results').select('id, topic_id, score, total, step_index, wrong_questions, questions, completed_at, topics(title)').eq('user_id', user.id).order('completed_at', { ascending: false })
      .then(({ data }) => { setQuizResults((data as any) || []); setLoadingQuizzes(false); });
  };

  useEffect(() => { fetchAll(); }, [user]);

  const handleDeleteRoadmap = async (roadmapId: string, topicId: string) => {
    if (!confirm('Delete this roadmap and all associated data?')) return;
    await Promise.all([
      supabase.from('flashcards').delete().eq('topic_id', topicId),
      supabase.from('quiz_results').delete().eq('topic_id', topicId),
      supabase.from('roadmaps').delete().eq('id', roadmapId),
      supabase.from('topics').delete().eq('id', topicId),
    ]);
    setRoadmaps(prev => prev.filter(r => r.id !== roadmapId));
    setTopics(prev => prev.filter(t => t.id !== topicId));
    setFlashcardGroups(prev => prev.filter(f => f.topic_id !== topicId));
    setQuizResults(prev => prev.filter(q => q.topic_id !== topicId));
    toast.success('Roadmap deleted');
  };

  const handleDeleteFlashcards = async (topicId: string, stepIndex: number | null) => {
    if (!confirm('Delete these flashcards?')) return;
    let query = supabase.from('flashcards').delete().eq('topic_id', topicId);
    if (stepIndex !== null && stepIndex !== undefined) {
      query = query.eq('step_index', stepIndex);
    } else {
      query = query.is('step_index', null);
    }
    await query;
    setFlashcardGroups(prev => prev.filter(f => !(f.topic_id === topicId && f.step_index === stepIndex)));
    toast.success('Flashcards deleted');
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Delete this quiz result?')) return;
    await supabase.from('quiz_results').delete().eq('id', quizId);
    setQuizResults(prev => prev.filter(q => q.id !== quizId));
    toast.success('Quiz result deleted');
  };

  const handleRetryWrong = (quiz: QuizResult) => {
    if (!quiz.wrong_questions || quiz.wrong_questions.length === 0) return;
    navigate(`/quiz/${quiz.topic_id}`, {
      state: {
        questions: quiz.wrong_questions,
        topicTitle: quiz.topics?.title || 'Quiz',
        stepIndex: quiz.step_index ?? undefined,
        retryMode: true,
      },
    });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Learner';

  const quizByTopic: Record<string, { title: string; quizzes: QuizResult[] }> = {};
  quizResults.forEach(q => {
    if (!quizByTopic[q.topic_id]) {
      quizByTopic[q.topic_id] = { title: q.topics?.title || 'Unknown', quizzes: [] };
    }
    quizByTopic[q.topic_id].quizzes.push(q);
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold text-foreground">Luminar</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <motion.div className="mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
           <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{isFirstVisit ? 'Welcome,' : 'Welcome back,'} {userName}</h1>
           <p className="text-muted-foreground text-lg">{isFirstVisit ? "Let's start your learning journey." : 'Continue your learning journey.'}</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="grid sm:grid-cols-3 gap-4 mb-12" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <button onClick={() => navigate('/learn')} className="group p-6 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all text-left">
            <Brain className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-serif font-bold text-foreground mb-1">New Roadmap</h3>
            <p className="text-sm text-muted-foreground">Enter a topic & get a learning path</p>
          </button>
          <button onClick={() => switchTabFromAction("flashcards")} className="group p-6 rounded-xl bg-accent/5 border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all text-left">
            <Sparkles className="h-8 w-8 text-accent mb-3" />
            <h3 className="font-serif font-bold text-foreground mb-1">Flashcards</h3>
            <p className="text-sm text-muted-foreground">Generate from any document or URL</p>
          </button>
          <button onClick={() => switchTabFromAction("quizzes")} className="group p-6 rounded-xl bg-warning/5 border border-warning/20 hover:border-warning/40 hover:bg-warning/10 transition-all text-left">
            <Zap className="h-8 w-8 text className="h-8 w-8 text-warning mb-3" />
            <h3 className="font-serif font-bold text-foreground mb-1">Take a Quiz</h3>
            <p className="text-sm text-muted-foreground">Test your knowledge</p>
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-3 gap-4 mb-12" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="p-5 rounded-xl bg-card border border-border text-center">
            <Brain className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{roadmaps.length}</p>
            <p className="text-sm text-muted-foreground">Roadmaps</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border text-center">
            <Sparkles className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{flashcardGroups.reduce((sum, g) => sum + g.count, 0)}</p>
            <p className="text-sm text-muted-foreground">Flashcards</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border texZap className="h-6 w-6 text-warning mx-auto msshZapNamZap6 tZapng Zapb-2" />
            <p className="text-2xl font-bold text-foreground">{quizResults.length}</p>
            <p className="text-sm text-muted-foreground">Quizzes</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" id="dashboard-tabs">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="roadmaps"><Map className="h-4 w-4 mr-1.5" /> Roadmaps</TabsTrigger>
                <TabsTrigger value="flashcards"><Sparkles className="h-4 w-4 mr-1.5" /> Flashcards</TabsTrigger>
                <TabsTrigger value="quizzes"><Crosshair clZaph-4 w-4 mZap Quizzes<Zapger>
                <TabsTrigger value="history"><Clock className="h-4 w-4 mr-1.5" /> History</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={() => navigate('/learn')}>
                <Plus className="h-4 w-4 mr-2" /> New Topic
              </Button>
            </div>

            {/* Roadmaps Tab */}
            <TabsContent value="roadmaps">
              <motion.div
                key={`roadmaps-${highlightTab && activeTab === 'roadmaps' ? 'highlight' : 'normal'}`}
                initial={highlightTab && activeTab === 'roadmaps' ? { opacity: 0, y: 12, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={highlightTab && activeTab === 'roadmaps' ? 'ring-2 ring-primary/30 rounded-2xl p-1 transition-all duration-700' : ''}
              >
              {loadingRoadmaps ? (
                <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
              ) : roadmaps.length > 0 ? (
                <div className="grid gap-3">
                  {roadmaps.map((roadmap) => (
                    <div key={roadmap.id} className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/roadmap/${roadmap.topic_id}`)}
                        className="flex-1 flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{roadmap.topics?.title || 'Untitled'}</h3>
                          <p className="text-sm text-muted-foreground">{new Date(roadmap.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${roadmap.progress}%` }} />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{roadmap.progress}%</span>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </button>
                      <button onClick={() => handleDeleteRoadmap(roadmap.id, roadmap.topic_id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Map} title="No roadmaps yet" desc="Generate your first learning roadmap" onAction={() => navigate('/learn')} actionText="Create Roadmap" />
              )}
              </motion.div>
            </TabsContent>

            {/* Flashcards Tab */}
            <TabsContent value="flashcards">
              <motion.div
                key={`flashcards-${highlightTab && activeTab === 'flashcards' ? 'highlight' : 'normal'}`}
                initial={highlightTab && activeTab === 'flashcards' ? { opacity: 0, y: 12, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={highlightTab && activeTab === 'flashcards' ? 'ring-2 ring-primary/30 rounded-2xl p-1 transition-all duration-700' : ''}
              >
                <FlashcardCreator />
              </motion.div>
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes">
              <motion.div
                key={`quizzes-${highlightTab && activeTab === 'quizzes' ? 'highlight' : 'normal'}`}
                initial={highlightTab && activeTab === 'quizzes' ? { opacity: 0, y: 12, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={highlightTab && activeTab === 'quizzes' ? 'ring-2 ring-primary/30 rounded-2xl p-1 transition-all duration-700' : ''}
              >
              {loadingQuizzes ? (
                <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
              ) : Object.keys(quizByTopic).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(quizByTopic).map(([topicId, { title, quizzes }]) => (
                    <div key={topicId}>
                      <h3 className="font-serif font-bold text-foreground mb-3 text-lg">{title}</h3>
                      <div className="grid gap-2 ml-2">
                        {quizzes.map((quiz) => (
                          <div key={quiz.id} className="flex items-center gap-2">
                            <div className="flex-1 p-4 rounded-xl bg-card border border-border">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Score: {quiz.score}/{quiz.total} ({Math.round((quiz.score / quiz.total) * 100)}%)
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {quiz.step_index !== null ? `Step ${quiz.step_index + 1}` : 'Full topic'} · {new Date(quiz.completed_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {quiz.wrong_questions && quiz.wrong_questions.length > 0 && (
                                    <button
                                      onClick={() => handleRetryWrong(quiz)}
                                      className="text-xs px-2.5 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors flex items-center gap-1 font-medium"
                                      title="Retry wrong questions"
                                    >
                                      <RotateCcw className="h-3 w-3" /> Retry {quiz.wrong_questions.length}
                                    </button>
                                  )}
                                  <div className={`h-2 w-2 rounded-full ${quiz.score / quiz.total >= 0.7 ? 'bg-success' : quiz.score / quiz.total >= 0.4 ? 'bg-warning' : 'bg-destructive'}`} />
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteQuiz(quiz.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Crosshair} title="Zaps yet" desc="TaZap from your roadmap to test your knowledge" onAction={() => navigate('/learn')} actionText="Start Learning" />
              )}
              </motion.div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <div className="space-y-8">
                {/* Flashcard History */}
                <div>
                  <h3 className="font-serif font-bold text-foreground mb-4 text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" /> Flashcard Sets
                  </h3>
                  {loadingFlashcards ? (
                    <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
                  ) : flashcardGroups.length > 0 ? (
                    <div className="grid gap-3">
                      {flashcardGroups.map((group, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/flashcards/${group.topic_id}${group.step_index !== null ? `?step=${group.step_index}` : ''}`)}
                            className="flex-1 flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{group.topic_title}</h3>
                              <p className="text-sm text-muted-foreground">{group.step_title} · {group.count} cards</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground ml-4" />
                          </button>
                          <button onClick={() => handleDeleteFlashcards(group.topic_id, group.step_index)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 bg-card rounded-xl border border-border">No flashcard sets yet</p>
                  )}
                </div>

                {/* Quiz History */}
                <div>
                  <h3 className="font-serif font-bold text-foreground mb-4 text-lg flex items-center gap-2">
         <Crosshair className="h-5Zap-warning" /> Quiz Results
                  </h3>
                  {loadingQuizzes ? (
                    <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
                  ) : Object.keys(quizByTopic).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(quizByTopic).map(([topicId, { title, quizzes }]) => (
                        <div key={topicId}>
                          <h4 className="font-semibold text-foreground mb-2">{title}</h4>
                          <div className="grid gap-2 ml-2">
                            {quizzes.map((quiz) => (
                              <div key={quiz.id} className="flex items-center gap-2">
                                <div className="flex-1 p-4 rounded-xl bg-card border border-border">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        Score: {quiz.score}/{quiz.total} ({Math.round((quiz.score / quiz.total) * 100)}%)
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {quiz.step_index !== null ? `Step ${quiz.step_index + 1}` : 'Full topic'} · {new Date(quiz.completed_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {quiz.wrong_questions && quiz.wrong_questions.length > 0 && (
                                        <button
                                          onClick={() => handleRetryWrong(quiz)}
                                          className="text-xs px-2.5 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors flex items-center gap-1 font-medium"
                                        >
                                          <RotateCcw className="h-3 w-3" /> Retry {quiz.wrong_questions.length}
                                        </button>
                                      )}
                                      <div className={`h-2 w-2 rounded-full ${quiz.score / quiz.total >= 0.7 ? 'bg-success' : quiz.score / quiz.total >= 0.4 ? 'bg-warning' : 'bg-destructive'}`} />
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteQuiz(quiz.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 bg-card rounded-xl border border-border">No quiz results yet</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, onAction, actionText }: { icon: any; title: string; desc: string; onAction: () => void; actionText: string }) {
  return (
    <div className="text-center py-16 rounded-xl bg-card border border-border">
      <Icon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{desc}</p>
      <Button onClick={onAction}><Plus className="h-4 w-4 mr-2" /> {actionText}</Button>
    </div>
  );
}
