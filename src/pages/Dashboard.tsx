import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, ArrowRight, LogOut, Brain, Sparkles, Zap, Map, Trash2, RotateCcw, History, Clock, Pencil, CheckSquare, Merge, X, Check, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import FlashcardCreator from '@/components/FlashcardCreator';
import QuizCreator from '@/components/QuizCreator';
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
  id: string | null; // group_id from flashcard_groups table
  topic_id: string;
  topic_title: string;
  step_index: number | null;
  step_title: string;
  count: number;
  created_at: string;
  custom_name: string | null;
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

interface MindmapItem {
  id: string;
  topic: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapWithTopic[]>([]);
  const [flashcardGroups, setFlashcardGroups] = useState<FlashcardGroup[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [mindmaps, setMindmaps] = useState<MindmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const [loadingFlashcards, setLoadingFlashcards] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingMindmaps, setLoadingMindmaps] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [activeTab, setActiveTab] = useState("roadmaps");
  const [highlightTab, setHighlightTab] = useState(false);

  // Rename state
  const [renamingGroup, setRenamingGroup] = useState<FlashcardGroup | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Merge state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeName, setMergeName] = useState('');
  const [merging, setMerging] = useState(false);

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

    // Fetch flashcards with group info
    supabase.from('flashcards').select('id, topic_id, step_index, created_at, group_id').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(async ({ data: flashcards }) => {
        if (!flashcards || flashcards.length === 0) { setFlashcardGroups([]); setLoadingFlashcards(false); return; }
        const topicIds = [...new Set(flashcards.map(f => f.topic_id))];
        const [{ data: topicData }, { data: roadmapData }, { data: groupData }] = await Promise.all([
          supabase.from('topics').select('id, title').in('id', topicIds),
          supabase.from('roadmaps').select('topic_id, steps').in('topic_id', topicIds),
          supabase.from('flashcard_groups').select('*').eq('user_id', user.id),
        ]);
        const topicMap: Record<string, string> = {};
        topicData?.forEach(t => { topicMap[t.id] = t.title; });
        const stepsMap: Record<string, any[]> = {};
        roadmapData?.forEach(r => { stepsMap[r.topic_id] = r.steps as any[]; });
        const groupMap: Record<string, { id: string; name: string }> = {};
        groupData?.forEach(g => { groupMap[g.id] = { id: g.id, name: g.name }; });

        const groups: Record<string, FlashcardGroup> = {};
        flashcards.forEach(fc => {
          // Group by group_id if available, otherwise by topic+step
          const key = fc.group_id || `${fc.topic_id}-${fc.step_index ?? 'all'}`;
          if (!groups[key]) {
            const steps = stepsMap[fc.topic_id];
            let stepTitle = 'All Steps';
            if (fc.step_index !== null && fc.step_index !== undefined && steps?.[fc.step_index]) {
              stepTitle = steps[fc.step_index].title;
            }
            const grp = fc.group_id ? groupMap[fc.group_id] : null;
            groups[key] = {
              id: fc.group_id || null,
              topic_id: fc.topic_id,
              topic_title: topicMap[fc.topic_id] || 'Unknown',
              step_index: fc.step_index,
              step_title: stepTitle,
              count: 0,
              created_at: fc.created_at,
              custom_name: grp?.name || null,
            };
          }
          groups[key].count++;
        });
        setFlashcardGroups(Object.values(groups));
        setLoadingFlashcards(false);
      });

    supabase.from('quiz_results').select('id, topic_id, score, total, step_index, wrong_questions, questions, completed_at, topics(title)').eq('user_id', user.id).order('completed_at', { ascending: false })
      .then(({ data }) => { setQuizResults((data as any) || []); setLoadingQuizzes(false); });

    supabase.from('mindmaps').select('id, topic, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setMindmaps((data as any) || []); setLoadingMindmaps(false); });
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

  const handleDeleteMindmap = async (mindmapId: string) => {
    if (!confirm('Delete this mindmap?')) return;
    await supabase.from('mindmaps').delete().eq('id', mindmapId);
    setMindmaps(prev => prev.filter(m => m.id !== mindmapId));
    toast.success('Mindmap deleted');
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

  // Rename flashcard group
  const handleRename = async () => {
    if (!renamingGroup || !renameValue.trim() || !user) return;
    try {
      if (renamingGroup.id) {
        // Update existing group name
        await supabase.from('flashcard_groups').update({ name: renameValue.trim() }).eq('id', renamingGroup.id);
      } else {
        // Create a new group, then assign flashcards to it
        const { data: newGroup, error } = await supabase.from('flashcard_groups').insert({
          user_id: user.id,
          name: renameValue.trim(),
          topic_id: renamingGroup.topic_id,
        }).select().single();
        if (error) throw error;
        // Assign flashcards matching this topic+step to the new group
        let updateQuery = supabase.from('flashcards').update({ group_id: newGroup.id }).eq('topic_id', renamingGroup.topic_id).eq('user_id', user.id);
        if (renamingGroup.step_index !== null) {
          updateQuery = updateQuery.eq('step_index', renamingGroup.step_index);
        } else {
          updateQuery = updateQuery.is('step_index', null);
        }
        await updateQuery;
      }
      toast.success('Renamed successfully');
      setRenamingGroup(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to rename');
    }
  };

  // Merge flashcard groups
  const handleMerge = async () => {
    if (selectedGroups.size < 2 || !mergeName.trim() || !user) return;
    setMerging(true);
    try {
      const groupsToMerge = flashcardGroups.filter(g => {
        const key = g.id || `${g.topic_id}-${g.step_index ?? 'all'}`;
        return selectedGroups.has(key);
      });
      // Use first group's topic_id
      const targetTopicId = groupsToMerge[0].topic_id;

      // Create a new group
      const { data: newGroup, error } = await supabase.from('flashcard_groups').insert({
        user_id: user.id,
        name: mergeName.trim(),
        topic_id: targetTopicId,
      }).select().single();
      if (error) throw error;

      // Move all flashcards from selected groups into the new group
      for (const g of groupsToMerge) {
        if (g.id) {
          await supabase.from('flashcards').update({ group_id: newGroup.id }).eq('group_id', g.id).eq('user_id', user.id);
          // Delete old empty group
          await supabase.from('flashcard_groups').delete().eq('id', g.id);
        } else {
          let q = supabase.from('flashcards').update({ group_id: newGroup.id }).eq('topic_id', g.topic_id).eq('user_id', user.id).is('group_id', null);
          if (g.step_index !== null) {
            q = q.eq('step_index', g.step_index);
          } else {
            q = q.is('step_index', null);
          }
          await q;
        }
      }

      toast.success('Flashcard sets merged!');
      setMergeDialogOpen(false);
      setSelectMode(false);
      setSelectedGroups(new Set());
      setMergeName('');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to merge');
    } finally {
      setMerging(false);
    }
  };

  const toggleGroupSelection = (group: FlashcardGroup) => {
    const key = group.id || `${group.topic_id}-${group.step_index ?? 'all'}`;
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
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

  const getGroupDisplayName = (group: FlashcardGroup) => {
    if (group.custom_name) return group.custom_name;
    return `${group.topic_title} — ${group.step_title}`;
  };

  return (
    <div className="min-h-screen bg-background aurora-bg">
      <nav className="border-b border-border/50 glass-nav sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center neon-glow-sm">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">Luminar</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-5xl relative z-10">
        <motion.div className="mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
           <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-heading">
             {isFirstVisit ? 'Welcome,' : 'Welcome back,'}{' '}
             <span className="gradient-text">{userName}</span>
           </h1>
           <p className="text-muted-foreground text-lg">{isFirstVisit ? "Let's start your learning journey." : 'Continue your learning journey.'}</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <button onClick={() => navigate('/learn')} className="group p-6 rounded-2xl glass-card border border-primary/20 hover:border-primary/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--neon-cyan)/0.3)]">
            <Brain className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-heading font-bold text-foreground mb-1">New Roadmap</h3>
            <p className="text-sm text-muted-foreground">Enter a topic & get a learning path</p>
          </button>
          <button onClick={() => switchTabFromAction("mindmaps")} className="group p-6 rounded-2xl glass-card border border-success/20 hover:border-success/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--success)/0.3)]">
            <GitBranch className="h-8 w-8 text-success mb-3" />
            <h3 className="font-heading font-bold text-foreground mb-1">Mindmaps</h3>
            <p className="text-sm text-muted-foreground">Visual topic exploration</p>
          </button>
          <button onClick={() => switchTabFromAction("flashcards")} className="group p-6 rounded-2xl glass-card border border-secondary/20 hover:border-secondary/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--neon-purple)/0.3)]">
            <Sparkles className="h-8 w-8 text-secondary mb-3" />
            <h3 className="font-heading font-bold text-foreground mb-1">Flashcards</h3>
            <p className="text-sm text-muted-foreground">Generate from any document or URL</p>
          </button>
          <button onClick={() => switchTabFromAction("quizzes")} className="group p-6 rounded-2xl glass-card border border-warning/20 hover:border-warning/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--warning)/0.3)]">
            <Zap className="h-8 w-8 text-warning mb-3" />
            <h3 className="font-heading font-bold text-foreground mb-1">Take a Quiz</h3>
            <p className="text-sm text-muted-foreground">Test your knowledge</p>
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="p-5 rounded-2xl glass-card border-t-2 border-t-primary border border-border/50 text-center">
            <Brain className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{roadmaps.length}</p>
            <p className="text-sm text-muted-foreground">Roadmaps</p>
          </div>
          <div className="p-5 rounded-2xl glass-card border-t-2 border-t-success border border-border/50 text-center">
            <GitBranch className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{mindmaps.length}</p>
            <p className="text-sm text-muted-foreground">Mindmaps</p>
          </div>
          <div className="p-5 rounded-2xl glass-card border-t-2 border-t-secondary border border-border/50 text-center">
            <Sparkles className="h-6 w-6 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{flashcardGroups.reduce((sum, g) => sum + g.count, 0)}</p>
            <p className="text-sm text-muted-foreground">Flashcards</p>
          </div>
          <div className="p-5 rounded-2xl glass-card border-t-2 border-t-warning border border-border/50 text-center">
            <Zap className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{quizResults.length}</p>
            <p className="text-sm text-muted-foreground">Quizzes</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" id="dashboard-tabs">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="glass-card border border-border/50">
                <TabsTrigger value="roadmaps"><Map className="h-4 w-4 mr-1.5" /> Roadmaps</TabsTrigger>
                <TabsTrigger value="mindmaps"><GitBranch className="h-4 w-4 mr-1.5" /> Mindmaps</TabsTrigger>
                <TabsTrigger value="flashcards"><Sparkles className="h-4 w-4 mr-1.5" /> Flashcards</TabsTrigger>
                <TabsTrigger value="quizzes"><Zap className="h-4 w-4 mr-1.5" /> Quizzes</TabsTrigger>
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
                <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl shimmer-cyan" />)}</div>
              ) : roadmaps.length > 0 ? (
                <div className="grid gap-3">
                  {roadmaps.map((roadmap) => (
                    <div key={roadmap.id} className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/roadmap/${roadmap.topic_id}`)}
                        className="flex-1 flex items-center justify-between p-5 rounded-2xl glass-card border border-border/50 hover:border-primary/30 card-hover transition-all text-left hover:neon-glow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{roadmap.topics?.title || 'Untitled'}</h3>
                          <p className="text-sm text-muted-foreground">{new Date(roadmap.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${roadmap.progress}%` }} />
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
                <QuizCreator />
                
                {/* Quiz History */}
                <div className="mt-10">
                  <h3 className="font-heading font-bold text-foreground mb-4 text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-warning" /> Quiz Results
                  </h3>
              {loadingQuizzes ? (
                <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl shimmer-cyan" />)}</div>
              ) : Object.keys(quizByTopic).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(quizByTopic).map(([topicId, { title, quizzes }]) => (
                    <div key={topicId}>
                      <h3 className="font-heading font-bold text-foreground mb-3 text-lg">{title}</h3>
                      <div className="grid gap-2 ml-2">
                        {quizzes.map((quiz) => (
                          <div key={quiz.id} className="flex items-center gap-2">
                            <div className="flex-1 p-4 rounded-2xl glass-card border border-border/50">
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
                <p className="text-muted-foreground text-center py-8 glass-card rounded-2xl border border-border/50">No quiz results yet</p>
              )}
                </div>
              </motion.div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <div className="space-y-8">
                {/* Flashcard History */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-foreground text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-secondary" /> Flashcard Sets
                    </h3>
                    {flashcardGroups.length > 1 && (
                      <div className="flex items-center gap-2">
                        {selectMode && selectedGroups.size >= 2 && (
                          <Button size="sm" variant="glow" onClick={() => { setMergeName(''); setMergeDialogOpen(true); }}>
                            <Merge className="h-3.5 w-3.5 mr-1.5" /> Merge ({selectedGroups.size})
                          </Button>
                        )}
                        <Button size="sm" variant={selectMode ? "default" : "outline"} onClick={() => { setSelectMode(!selectMode); setSelectedGroups(new Set()); }}>
                          {selectMode ? <><X className="h-3.5 w-3.5 mr-1" /> Cancel</> : <><CheckSquare className="h-3.5 w-3.5 mr-1" /> Select</>}
                        </Button>
                      </div>
                    )}
                  </div>
                  {loadingFlashcards ? (
                    <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl shimmer-cyan" />)}</div>
                  ) : flashcardGroups.length > 0 ? (
                    <div className="grid gap-3">
                      {flashcardGroups.map((group, i) => {
                        const groupKey = group.id || `${group.topic_id}-${group.step_index ?? 'all'}`;
                        const isSelected = selectedGroups.has(groupKey);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            {selectMode && (
                              <button
                                onClick={() => toggleGroupSelection(group)}
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary/60'}`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (selectMode) { toggleGroupSelection(group); return; }
                                if (group.id) {
                                  navigate(`/flashcards/${group.topic_id}?group=${group.id}`);
                                } else {
                                  navigate(`/flashcards/${group.topic_id}${group.step_index !== null ? `?step=${group.step_index}` : ''}`);
                                }
                              }}
                              className={`flex-1 flex items-center justify-between p-5 rounded-2xl glass-card border transition-all text-left ${isSelected ? 'border-primary/50 shadow-[0_0_12px_-4px_hsl(var(--neon-cyan)/0.3)]' : 'border-border/50 hover:border-primary/30 card-hover'}`}
                            >
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">{getGroupDisplayName(group)}</h3>
                                <p className="text-sm text-muted-foreground">{group.count} cards</p>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground ml-4" />
                            </button>
                            {!selectMode && (
                              <button
                                onClick={() => { setRenamingGroup(group); setRenameValue(group.custom_name || `${group.topic_title} — ${group.step_title}`); }}
                                className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                                title="Rename"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {!selectMode && (
                              <button onClick={() => handleDeleteFlashcards(group.topic_id, group.step_index)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 glass-card rounded-2xl border border-border/50">No flashcard sets yet</p>
                  )}
                </div>

                {/* Quiz History */}
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-4 text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-warning" /> Quiz Results
                  </h3>
                  {loadingQuizzes ? (
                    <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl shimmer-cyan" />)}</div>
                  ) : Object.keys(quizByTopic).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(quizByTopic).map(([topicId, { title, quizzes }]) => (
                        <div key={topicId}>
                          <h4 className="font-semibold text-foreground mb-2">{title}</h4>
                          <div className="grid gap-2 ml-2">
                            {quizzes.map((quiz) => (
                              <div key={quiz.id} className="flex items-center gap-2">
                                <div className="flex-1 p-4 rounded-2xl glass-card border border-border/50">
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
                    <p className="text-muted-foreground text-center py-8 glass-card rounded-2xl border border-border/50">No quiz results yet</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Rename Dialog */}
      <Dialog open={!!renamingGroup} onOpenChange={(open) => { if (!open) setRenamingGroup(null); }}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-heading">Rename Flashcard Set</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter new name..."
            className="bg-background/50"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingGroup(null)}>Cancel</Button>
            <Button variant="glow" onClick={handleRename} disabled={!renameValue.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-heading">Merge Flashcard Sets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Merging {selectedGroups.size} sets into one. Choose a name:</p>
          <Input
            value={mergeName}
            onChange={(e) => setMergeName(e.target.value)}
            placeholder="Enter merged set name..."
            className="bg-background/50"
            onKeyDown={(e) => e.key === 'Enter' && handleMerge()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button variant="glow" onClick={handleMerge} disabled={!mergeName.trim() || merging}>
              {merging ? 'Merging...' : 'Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, onAction, actionText }: { icon: any; title: string; desc: string; onAction: () => void; actionText: string }) {
  return (
    <div className="text-center py-16 rounded-2xl glass-card border border-border/50">
      <Icon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{desc}</p>
      <Button variant="glow" onClick={onAction}><Plus className="h-4 w-4 mr-2" /> {actionText}</Button>
    </div>
  );
}
