import { motion } from 'framer-motion';
import { BookOpen, Brain, Zap, ArrowRight, Sparkles, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

const features = [
  {
    icon: Brain,
    title: 'AI-Generated Roadmaps',
    description: 'Enter any topic and get a structured learning path tailored to your level.',
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: Sparkles,
    title: 'Smart Flashcards',
    description: 'AI creates study cards from your topics. Swipe through and master concepts.',
    gradient: 'from-accent/20 to-accent/5',
    iconColor: 'text-accent',
  },
  {
    icon: Target,
    title: 'Adaptive Quizzes',
    description: 'Test your knowledge with AI-generated multiple-choice questions and instant scoring.',
    gradient: 'from-success/20 to-success/5',
    iconColor: 'text-success',
  },
  {
    icon: BarChart3,
    title: 'Track Progress',
    description: 'See your streaks, completion rates, and learning analytics on your dashboard.',
    gradient: 'from-warning/20 to-warning/5',
    iconColor: 'text-warning',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground tracking-tight">Luminar</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity">
                Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')} className="font-medium">
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth?mode=signup')} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Decorative blobs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-80 h-80 rounded-full bg-accent/8 blur-[100px] pointer-events-none" />

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
              <Sparkles className="h-4 w-4" />
              AI-Powered Learning Platform
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight text-foreground mb-6">
              Learn anything,{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                effortlessly
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Enter any topic and let AI create your personalized roadmap, flashcards, and quizzes. 
              Study smarter, track your progress, and master new subjects with ease.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="text-base px-8 py-6 gradient-primary border-0 shadow-glow hover:opacity-90 transition-all font-semibold"
                onClick={() => navigate(user ? '/dashboard' : '/auth?mode=signup')}
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Learning — Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6 font-semibold border-border/60 hover:border-primary/40 hover:bg-primary/5"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Everything you need to learn{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">effectively</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Powered by AI, designed for focused, efficient learning.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className={`p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-border/50 hover:border-primary/30 shadow-card hover:shadow-glow transition-all duration-400 group`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="h-14 w-14 rounded-2xl bg-background/80 border border-border/50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 font-heading">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 relative">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Ready to transform how you learn?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join Luminar and start mastering any subject with AI by your side.
            </p>
            <Button
              size="lg"
              className="text-base px-8 py-6 gradient-primary border-0 shadow-glow hover:opacity-90 transition-all font-semibold"
              onClick={() => navigate(user ? '/dashboard' : '/auth?mode=signup')}
            >
              Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-foreground">Luminar</span>
          </div>
          <p>© {new Date().getFullYear()} Luminar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
