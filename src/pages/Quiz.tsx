import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function Quiz() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const questions: Question[] = location.state?.questions || [];
  const topicTitle: string = location.state?.topicTitle || 'Quiz';
  const stepIndex: number | undefined = location.state?.stepIndex;
  const stepTitle: string | undefined = location.state?.stepTitle;
  const retryMode: boolean = location.state?.retryMode || false;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No quiz data. Generate a quiz from your roadmap first.</p>
        <Button onClick={() => navigate(topicId ? `/roadmap/${topicId}` : '/dashboard')}>Go Back</Button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(optionIndex);
    setShowResult(true);
    const isCorrect = optionIndex === currentQ.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setWrongQuestions((prev) => [...prev, currentQ]);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setFinished(true);
      if (user && topicId && !retryMode) {
        try {
          await supabase.from('quiz_results').insert({
            topic_id: topicId,
            user_id: user.id,
            score,
            total: questions.length,
            questions,
            step_index: stepIndex ?? null,
            wrong_questions: wrongQuestions,
          });
        } catch (e) {
          console.error('Failed to save quiz result', e);
        }
      }
    }
  };

  const handleRetryWrong = () => {
    if (wrongQuestions.length === 0) return;
    navigate(`/quiz/${topicId}`, {
      state: {
        questions: wrongQuestions,
        topicTitle,
        stepIndex,
        stepTitle,
        retryMode: true,
      },
      replace: true,
    });
    // Reset local state for retry
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
    setWrongQuestions([]);
  };

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-serif text-xl font-bold text-foreground">Luminar</span>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-16 max-w-lg text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <Trophy className={`h-16 w-16 mx-auto mb-6 ${percentage >= 70 ? 'text-primary' : 'text-muted-foreground'}`} />
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {retryMode ? 'Retry Complete!' : 'Quiz Complete!'}
            </h1>
            <p className="text-muted-foreground text-lg mb-1">{topicTitle}</p>
            {stepTitle && <p className="text-sm text-muted-foreground mb-8">Step: {stepTitle}</p>}
            {!stepTitle && <div className="mb-8" />}

            <div className="p-8 rounded-2xl bg-card border border-border mb-8">
              <p className="text-5xl font-bold text-foreground mb-2">{score}/{questions.length}</p>
              <p className="text-muted-foreground text-lg">{percentage}% correct</p>
              <div className="h-3 bg-muted rounded-full overflow-hidden mt-4">
                <motion.div
                  className={`h-full rounded-full ${percentage >= 70 ? 'bg-primary' : percentage >= 40 ? 'bg-warning' : 'bg-destructive'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>

            {wrongQuestions.length > 0 && (
              <div className="text-left mb-8 p-5 rounded-xl bg-destructive/5 border border-destructive/20">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Questions to Review ({wrongQuestions.length})
                </h3>
                <ul className="space-y-3">
                  {wrongQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-foreground/80">
                      <p className="font-medium">{q.question}</p>
                      <p className="text-muted-foreground mt-1">✓ {q.options[q.correctIndex]}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {wrongQuestions.length > 0 && (
                <Button onClick={handleRetryWrong} variant="default" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retry Wrong Questions ({wrongQuestions.length})
                </Button>
              )}
              <Button variant={wrongQuestions.length > 0 ? 'outline' : 'default'} onClick={() => navigate(`/roadmap/${topicId}`)}>Back to Roadmap</Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            </div>
          </motion.div>
        </main>
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
          <div className="flex items-center gap-3">
            {retryMode && <span className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning font-medium">Retry Mode</span>}
            {stepTitle && <span className="text-xs text-muted-foreground hidden sm:block">{stepTitle}</span>}
            <Button variant="ghost" size="sm" onClick={() => navigate(`/roadmap/${topicId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Exit Quiz
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Question {currentIndex + 1} of {questions.length}</span>
            <span className="font-semibold text-foreground">Score: {score}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-8 font-serif leading-relaxed">{currentQ.question}</h2>
          <div className="space-y-3 mb-8">
            {currentQ.options.map((option, oi) => {
              let classes = 'w-full text-left p-5 rounded-xl border-2 transition-all ';
              if (showResult) {
                if (oi === currentQ.correctIndex) classes += 'bg-success/10 border-success/40 text-foreground';
                else if (oi === selectedAnswer && oi !== currentQ.correctIndex) classes += 'bg-destructive/10 border-destructive/40 text-foreground';
                else classes += 'bg-card border-border text-muted-foreground opacity-60';
              } else {
                classes += 'bg-card border-border text-foreground hover:border-primary/30 hover:bg-primary/5 cursor-pointer';
              }
              return (
                <button key={oi} className={classes} onClick={() => handleSelect(oi)} disabled={showResult}>
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">{String.fromCharCode(65 + oi)}</span>
                    <span className="text-base">{option}</span>
                    {showResult && oi === currentQ.correctIndex && <CheckCircle2 className="h-5 w-5 text-success ml-auto shrink-0" />}
                    {showResult && oi === selectedAnswer && oi !== currentQ.correctIndex && <XCircle className="h-5 w-5 text-destructive ml-auto shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showResult && (
            <motion.div className="p-5 rounded-xl bg-card border border-border mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm font-medium text-muted-foreground mb-1">Explanation</p>
              <p className="text-foreground">{currentQ.explanation}</p>
            </motion.div>
          )}

          {showResult && (
            <Button onClick={handleNext} className="w-full py-5" size="lg">
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </Button>
          )}
        </motion.div>
      </main>
    </div>
  );
}
