import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Flame, Clock, ArrowRight, LogOut, Brain, Sparkles, Target, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapWithTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchTopics() {
      const { data } = await supabase
        .from('topics')
        .select('id, title, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(6);
      setTopics(data || []);
      setLoading(false);
    }

    async function fetchRoadmaps() {
      const { data } = await supabase
        .from('roadmaps')
        .select('id, progress, created_at, topic_id, topics(title)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      setRoadmaps((data as any) || []);
      setLoadingRoadmaps(false);
    }

    fetchTopics();
    fetchRoadmaps();
  }, [user]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Learner';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold text-foreground">Luminar</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Welcome */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground text-lg">Continue your learning journey.</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid sm:grid-cols-3 gap-4 mb-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <button
            onClick={() => navigate('/learn')}
            className="group p-6 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all text-left"
          >
            <Brain className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-serif font-bold text-foreground mb-1">New Roadmap</h3>
            <p className="text-sm text-muted-foreground">Enter a topic & get a learning path</p>
          </button>
          <button
            onClick={() => navigate('/flashcards')}
            className="group p-6 rounded-xl bg-accent/5 border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all text-left"
          >
            <Sparkles className="h-8 w-8 text-accent mb-3" />
            <h3 className="font-serif font-bold text-foreground mb-1">Flashcards</h3>
            <p className="text-sm text-muted-foreground">Study with AI-generated cards</p>
          </button>
          <button
            onClick={() => navigate('/quiz')}
            className="group p-6 rounded-xl bg-success/5 border border-success/20 hover:border-success/40 hover:bg-success/10 transition-all text-left"
          >
            <Target className="h-8 w-8 text-success mb-3" />
            <h3 className="font-serif font-bold text-foreground mb-1">Take a Quiz</h3>
            <p className="text-sm text-muted-foreground">Test your knowledge</p>
          </button>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="p-5 rounded-xl bg-card border border-border text-center">
            <Flame className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border text-center">
            <BookOpen className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{topics.length}</p>
            <p className="text-sm text-muted-foreground">Topics</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border text-center">
            <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground">Quizzes Taken</p>
          </div>
        </motion.div>

        {/* Tabs: Recent Topics + Roadmap History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tabs defaultValue="topics" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="topics">Recent Topics</TabsTrigger>
                <TabsTrigger value="roadmaps">
                  <Map className="h-4 w-4 mr-2" /> Roadmap History
                </TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={() => navigate('/learn')}>
                <Plus className="h-4 w-4 mr-2" /> New Topic
              </Button>
            </div>

            <TabsContent value="topics">
              {loading ? (
                <div className="grid gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : topics.length > 0 ? (
                <div className="grid gap-3">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/roadmap/${topic.id}`)}
                      className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
                    >
                      <div>
                        <h3 className="font-semibold text-foreground">{topic.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(topic.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 rounded-xl bg-card border border-border">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No topics yet</h3>
                  <p className="text-muted-foreground mb-6">Start learning by exploring a new topic</p>
                  <Button onClick={() => navigate('/learn')}>
                    <Plus className="h-4 w-4 mr-2" /> Explore a Topic
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="roadmaps">
              {loadingRoadmaps ? (
                <div className="grid gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : roadmaps.length > 0 ? (
                <div className="grid gap-3">
                  {roadmaps.map((roadmap) => (
                    <button
                      key={roadmap.id}
                      onClick={() => navigate(`/roadmap/${roadmap.topic_id}`)}
                      className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {roadmap.topics?.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(roadmap.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${roadmap.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {roadmap.progress}%
                          </span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 rounded-xl bg-card border border-border">
                  <Map className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No roadmaps yet</h3>
                  <p className="text-muted-foreground mb-6">Generate your first learning roadmap</p>
                  <Button onClick={() => navigate('/learn')}>
                    <Plus className="h-4 w-4 mr-2" /> Create Roadmap
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
