import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, ArrowRight, LogOut, Brain, Sparkles, Zap, Map, Trash2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

interface RoadmapWithTopic {
  id: string;
  progress: number;
  created_at: string;
  topics: { title: string } | null;
  topic_id: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState<RoadmapWithTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [counts, setCounts] = useState({ mindmaps: 0, flashcards: 0, quizzes: 0 });

  useEffect(() => {
    if (!user) return;

    supabase.from('roadmaps').select('id, progress, created_at, topic_id, topics(title)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setRoadmaps((data as any) || []); setIsFirstVisit(!data || data.length === 0); setLoading(false); });

    // Fetch counts for stats
    Promise.all([
      supabase.from('mindmaps').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('quiz_results').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([mm, fc, qz]) => {
      setCounts({ mindmaps: mm.count || 0, flashcards: fc.count || 0, quizzes: qz.count || 0 });
    });
  }, [user]);

  const handleDeleteRoadmap = async (roadmapId: string, topicId: string) => {
    if (!confirm('Delete this roadmap and all associated data?')) return;
    await Promise.all([
      supabase.from('flashcards').delete().eq('topic_id', topicId),
      supabase.from('quiz_results').delete().eq('topic_id', topicId),
      supabase.from('roadmaps').delete().eq('id', roadmapId),
      supabase.from('topics').delete().eq('id', topicId),
    ]);
    setRoadmaps(prev => prev.filter(r => r.id !== roadmapId));
    toast.success('Roadmap deleted');
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Learner';

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
          <button onClick={() => navigate('/my-mindmaps')} className="group p-6 rounded-2xl glass-card border border-success/20 hover:border-success/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--success)/0.3)]">
            <GitBranch className="h-8 w-8 text-success mb-3" />
            <h3 className="font-heading font-bold text-foreground mb-1">Mindmaps</h3>
            <p className="text-sm text-muted-foreground">Visual topic exploration</p>
          </button>
          <button onClick={() => navigate('/my-flashcards')} className="group p-6 rounded-2xl glass-card border border-secondary/20 hover:border-secondary/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--neon-purple)/0.3)]">
            <Sparkles className="h-8 w-8 text-secondary mb-3" />
            <h3 className="font-heading font-bold text-foreground mb-1">Flashcards</h3>
            <p className="text-sm text-muted-foreground">Generate from any document or URL</p>
          </button>
          <button onClick={() => navigate('/my-quizzes')} className="group p-6 rounded-2xl glass-card border border-warning/20 hover:border-warning/50 card-hover transition-all text-left hover:shadow-[0_0_24px_-6px_hsl(var(--warning)/0.3)]">
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
          <button onClick={() => navigate('/my-mindmaps')} className="p-5 rounded-2xl glass-card border-t-2 border-t-success border border-border/50 text-center hover:border-success/30 transition-all card-hover">
            <GitBranch className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{counts.mindmaps}</p>
            <p className="text-sm text-muted-foreground">Mindmaps</p>
          </button>
          <button onClick={() => navigate('/my-flashcards')} className="p-5 rounded-2xl glass-card border-t-2 border-t-secondary border border-border/50 text-center hover:border-secondary/30 transition-all card-hover">
            <Sparkles className="h-6 w-6 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{counts.flashcards}</p>
            <p className="text-sm text-muted-foreground">Flashcards</p>
          </button>
          <button onClick={() => navigate('/my-quizzes')} className="p-5 rounded-2xl glass-card border-t-2 border-t-warning border border-border/50 text-center hover:border-warning/30 transition-all card-hover">
            <Zap className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{counts.quizzes}</p>
            <p className="text-sm text-muted-foreground">Quizzes</p>
          </button>
        </motion.div>

        {/* Roadmaps List */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" /> Your Roadmaps
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/learn')}>
              <Plus className="h-4 w-4 mr-2" /> New Topic
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl shimmer-cyan" />)}</div>
          ) : roadmaps.length > 0 ? (
            <div className="grid gap-3">
              {roadmaps.map(roadmap => (
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
            <div className="text-center py-16 rounded-2xl glass-card border border-border/50">
              <Map className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No roadmaps yet</h3>
              <p className="text-muted-foreground mb-6">Generate your first learning roadmap</p>
              <Button variant="glow" onClick={() => navigate('/learn')}><Plus className="h-4 w-4 mr-2" /> Create Roadmap</Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
