import { motion } from 'framer-motion';
import { BookOpen, Brain, Zap, ArrowRight, Sparkles, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  {
    icon: Brain,
    title: 'AI-Generated Roadmaps',
    description: 'Enter any topic and get a structured learning path tailored to your level.',
  },
  {
    icon: Sparkles,
    title: 'Smart Flashcards',
    description: 'AI creates study cards from your topics. Swipe through and master concepts.',
  },
  {
    icon: Target,
    title: 'Adaptive Quizzes',
    description: 'Test your knowledge with AI-generated multiple-choice questions and instant scoring.',
  },
  {
    icon: BarChart3,
    title: 'Track Progress',
    description: 'See your streaks, completion rates, and learning analytics on your dashboard.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold text-foreground">Luminar</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/dashboard')}>
                Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth?mode=signup')}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              AI-Powered Learning
            </span>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight text-foreground mb-6">
              Learn anything,{' '}
              <span className="text-primary italic">effortlessly</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Enter any topic and let AI create your personalized roadmap, flashcards, and quizzes. 
              Study smarter, track your progress, and master new subjects with ease.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="text-base px-8 py-6"
                onClick={() => navigate(user ? '/dashboard' : '/auth?mode=signup')}
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Learning — Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to learn effectively
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Powered by AI, designed for focused, efficient learning.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="p-8 rounded-xl bg-background border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 font-serif">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to transform how you learn?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join Luminar and start mastering any subject with AI by your side.
            </p>
            <Button
              size="lg"
              className="text-base px-8 py-6"
              onClick={() => navigate(user ? '/dashboard' : '/auth?mode=signup')}
            >
              Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-serif font-semibold text-foreground">Luminar</span>
          </div>
          <p>© {new Date().getFullYear()} Luminar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
