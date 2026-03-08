import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastery_level: number;
}

export default function Flashcards() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topicTitle, setTopicTitle] = useState('');

  useEffect(() => {
    async function fetchCards() {
      if (!topicId || !user) return;

      const [cardsRes, topicRes] = await Promise.all([
        supabase.from('flashcards').select('*').eq('topic_id', topicId).order('created_at'),
        supabase.from('topics').select('title').eq('id', topicId).single(),
      ]);

      if (cardsRes.data) setCards(cardsRes.data);
      if (topicRes.data) setTopicTitle(topicRes.data.title);
      setLoading(false);
    }
    fetchCards();
  }, [topicId, user]);

  const currentCard = cards[currentIndex];

  const goNext = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex((i) => Math.min(i + 1, cards.length - 1)), 150);
  };

  const goPrev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex((i) => Math.max(i - 1, 0)), 150);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No flashcards found for this topic</p>
        <Button onClick={() => navigate(`/roadmap/${topicId}`)}>Back to Roadmap</Button>
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
          <Button variant="ghost" size="sm" onClick={() => navigate(`/roadmap/${topicId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{topicTitle}</h1>
          <p className="text-muted-foreground">
            Card {currentIndex + 1} of {cards.length}
          </p>
        </motion.div>

        {/* Card */}
        <div className="flex justify-center mb-8">
          <div
            className="w-full max-w-lg perspective-1000 cursor-pointer"
            onClick={() => setFlipped(!flipped)}
            style={{ perspective: '1000px' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentIndex}-${flipped}`}
                className={`relative w-full min-h-[320px] rounded-2xl p-8 flex flex-col items-center justify-center text-center border-2 transition-colors ${
                  flipped
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-card border-border'
                }`}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                  {flipped ? 'Answer' : 'Question'}
                </span>
                <p className={`text-xl md:text-2xl leading-relaxed ${flipped ? 'text-foreground' : 'font-serif font-semibold text-foreground'}`}>
                  {flipped ? currentCard.back : currentCard.front}
                </p>
                <p className="text-xs text-muted-foreground mt-6">
                  {flipped ? 'Click to see question' : 'Click to reveal answer'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setFlipped(false);
              setCurrentIndex(0);
            }}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={goNext}
            disabled={currentIndex === cards.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-8">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setFlipped(false);
                setCurrentIndex(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
