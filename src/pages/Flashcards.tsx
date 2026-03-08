import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Loader2, Plus, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastery_level: number;
  step_index: number | null;
  group_id: string | null;
}

export default function Flashcards() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const stepFilter = searchParams.get('step');
  const groupFilter = searchParams.get('group');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [stepTitle, setStepTitle] = useState('');
  const [stepTitles, setStepTitles] = useState<Record<number, string>>({});
  const [groupName, setGroupName] = useState<string | null>(null);

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    async function fetchCards() {
      if (!topicId || !user) return;

      let query = supabase.from('flashcards').select('*').eq('topic_id', topicId).order('created_at');
      if (groupFilter) {
        query = query.eq('group_id', groupFilter);
      } else if (stepFilter !== null) {
        query = query.eq('step_index', parseInt(stepFilter));
      }

      const [cardsRes, topicRes] = await Promise.all([
        query,
        supabase.from('topics').select('title').eq('id', topicId).single(),
      ]);

      if (cardsRes.data) setCards(cardsRes.data);
      if (topicRes.data) setTopicTitle(topicRes.data.title);

      // Fetch group name if viewing by group
      if (groupFilter) {
        const { data: grp } = await supabase.from('flashcard_groups').select('name').eq('id', groupFilter).single();
        if (grp) setGroupName(grp.name);
      }

      const { data: roadmap } = await supabase.from('roadmaps').select('steps').eq('topic_id', topicId).single();
      if (roadmap?.steps) {
        const steps = roadmap.steps as any[];
        const titles: Record<number, string> = {};
        steps.forEach((s: any, idx: number) => { titles[idx] = s.title; });
        setStepTitles(titles);
        if (stepFilter !== null) {
          const idx = parseInt(stepFilter);
          if (steps[idx]) setStepTitle(steps[idx].title);
        }
      }

      setLoading(false);
    }
    fetchCards();
  }, [topicId, user, stepFilter, groupFilter]);

  const handleGenerateMore = async () => {
    setGenerating(true);
    try {
      const body: any = { topicId };
      if (stepFilter !== null) {
        body.stepIndex = parseInt(stepFilter);
        body.stepTitle = stepTitle;
      }
      const { data, error } = await supabase.functions.invoke('generate-flashcards', { body });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      let query = supabase.from('flashcards').select('*').eq('topic_id', topicId!).order('created_at');
      if (groupFilter) {
        query = query.eq('group_id', groupFilter);
      } else if (stepFilter !== null) {
        query = query.eq('step_index', parseInt(stepFilter));
      }
      const { data: newCards } = await query;
      if (newCards) setCards(newCards);
      toast.success('More flashcards generated!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!renameValue.trim() || !user) return;
    try {
      if (groupFilter) {
        await supabase.from('flashcard_groups').update({ name: renameValue.trim() }).eq('id', groupFilter);
        setGroupName(renameValue.trim());
      } else {
        // Create group and assign cards
        const { data: newGroup, error } = await supabase.from('flashcard_groups').insert({
          user_id: user.id,
          name: renameValue.trim(),
          topic_id: topicId!,
        }).select().single();
        if (error) throw error;
        let updateQuery = supabase.from('flashcards').update({ group_id: newGroup.id }).eq('topic_id', topicId!).eq('user_id', user.id);
        if (stepFilter !== null) {
          updateQuery = updateQuery.eq('step_index', parseInt(stepFilter));
        } else {
          updateQuery = updateQuery.is('step_index', null);
        }
        await updateQuery;
        setGroupName(renameValue.trim());
        // Update URL to use group filter
        navigate(`/flashcards/${topicId}?group=${newGroup.id}`, { replace: true });
      }
      toast.success('Renamed!');
      setIsRenaming(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to rename');
    }
  };

  const currentCard = cards[currentIndex];
  const displayTitle = groupName || stepTitle || 'All Flashcards';

  const goNext = () => { setFlipped(false); setTimeout(() => setCurrentIndex((i) => Math.min(i + 1, cards.length - 1)), 150); };
  const goPrev = () => { setFlipped(false); setTimeout(() => setCurrentIndex((i) => Math.max(i - 1, 0)), 150); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const hasRoadmap = Object.keys(stepTitles).length > 0;

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No flashcards found for this topic</p>
        <Button onClick={() => navigate(hasRoadmap ? `/roadmap/${topicId}` : '/dashboard')}>
          {hasRoadmap ? 'Back to Roadmap' : 'Back to Dashboard'}
        </Button>
      </div>
    );
  }

  const isAllCards = stepFilter === null && !groupFilter;

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
          <div className="flex items-center gap-2">
            {!isRenaming && displayTitle && <span className="text-xs text-muted-foreground hidden sm:block px-2 py-1 rounded-md glass-card border border-border/50">{displayTitle}</span>}
            <Button variant="ghost" size="sm" onClick={() => navigate(hasRoadmap ? `/roadmap/${topicId}` : '/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> {hasRoadmap ? 'Back' : 'Dashboard'}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-2xl relative z-10">
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 font-heading">
            <span className="gradient-text">{topicTitle}</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(); if (e.key === 'Escape') setIsRenaming(false); }}
                  autoFocus
                />
                <button onClick={handleRenameGroup} className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setIsRenaming(false)} className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground flex items-center gap-1.5">
                {displayTitle}{' · '}Card {currentIndex + 1} of {cards.length}
                <button
                  onClick={() => { setRenameValue(groupName || stepTitle || `${topicTitle} — All`); setIsRenaming(true); }}
                  className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title="Rename this set"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </p>
            )}
          </div>
        </motion.div>

        {/* Card */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-lg cursor-pointer relative" onClick={() => setFlipped(!flipped)} style={{ perspective: '1000px' }}>
            {isAllCards && currentCard.step_index !== null && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/roadmap/${topicId}`);
                }}
                className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                title={`Step ${currentCard.step_index + 1}: ${stepTitles[currentCard.step_index] || ''}`}
              >
                Step {currentCard.step_index + 1}
              </button>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentIndex}-${flipped}`}
                className={`relative w-full min-h-[320px] rounded-2xl p-8 flex flex-col items-center justify-center text-center border-2 transition-all ${
                  flipped
                    ? 'glass-card border-primary/30 shadow-[0_0_24px_-6px_hsl(var(--neon-cyan)/0.3)]'
                    : 'glass-card border-border/50 hover:border-primary/20'
                }`}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">{flipped ? 'Answer' : 'Question'}</span>
                <p className={`text-xl md:text-2xl leading-relaxed ${flipped ? 'text-foreground' : 'font-heading font-semibold text-foreground'}`}>
                  {flipped ? currentCard.back : currentCard.front}
                </p>
                <p className="text-xs text-muted-foreground mt-6">{flipped ? 'Click to see question' : 'Click to reveal answer'}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="lg" onClick={goPrev} disabled={currentIndex === 0}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => { setFlipped(false); setCurrentIndex(0); }}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" onClick={goNext} disabled={currentIndex === cards.length - 1}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Generate more */}
        <div className="flex justify-center mt-6">
          <Button variant="outline" size="sm" onClick={handleGenerateMore} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Generate More Cards
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-8 flex-wrap">
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => { setFlipped(false); setCurrentIndex(i); }}
              className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-6 gradient-primary neon-glow-sm' : 'w-2 bg-muted-foreground/30'}`}
              title={isAllCards && card.step_index !== null ? `Step ${card.step_index + 1}` : undefined}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
