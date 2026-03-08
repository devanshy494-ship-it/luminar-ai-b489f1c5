import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Brain, ArrowLeft, Loader2, Sparkles, Plus, Upload, Link, FileText, Youtube, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const suggestions = [
  'Machine Learning Fundamentals',
  'JavaScript for Beginners',
  'Quantum Physics',
  'UX Design Principles',
  'Financial Investing',
  'World History',
];

type SourceType = 'file' | 'url' | 'text';

function isYouTubeUrl(urlStr: string) {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)/.test(urlStr);
}

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json' || ext === 'xml') {
    return file.text();
  }

  if (ext === 'pdf') {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PDF library'));
        document.head.appendChild(script);
      });
    }
    const lib = (window as any).pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  return await file.text();
}

export default function Learn() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>('file');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [fileName, setFileName] = useState('');
  const [extractedContent, setExtractedContent] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const hasSource = !!extractedContent;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setSourceError('File must be under 20MB');
      return;
    }
    setSourceError('');
    setFileName(file.name);
    setLoadingSource(true);
    try {
      const text = await extractTextFromFile(file);
      if (text.trim().length < 50) {
        setSourceError('Extracted text is too short.');
        setLoadingSource(false);
        return;
      }
      setExtractedContent(text);
      if (!topic) setTopic(file.name.replace(/\.[^.]+$/, ''));
    } catch (err: any) {
      setSourceError(err.message || 'Failed to read file');
    } finally {
      setLoadingSource(false);
    }
  };

  const [showYtFallback, setShowYtFallback] = useState(false);
  const [ytManualTranscript, setYtManualTranscript] = useState('');

  const handleUrlSource = async () => {
    if (!sourceUrl.trim()) return;
    setSourceError('');
    setShowYtFallback(false);
    setLoadingSource(true);
    const cleanUrl = sourceUrl.trim().startsWith('http') ? sourceUrl.trim() : `https://${sourceUrl.trim()}`;

    try {
      if (isYouTubeUrl(cleanUrl)) {
        const { data, error } = await supabase.functions.invoke('youtube-transcript', {
          body: { url: cleanUrl },
        });
        if (error) throw error;
        if (data?.error) {
          if (data?.fallbackToManual) {
            setShowYtFallback(true);
            setSourceError('Auto-extraction failed. Paste the transcript manually below.');
            return;
          }
          throw new Error(data.error);
        }
        setExtractedContent(data.transcript);
        if (!topic) setTopic(data.title || '');
      } else {
        const { data, error } = await supabase.functions.invoke('analyze-document', {
          body: { url: cleanUrl },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setExtractedContent(`[URL content analyzed: ${cleanUrl}]`);
        if (!topic && data.analysis?.title) setTopic(data.analysis.title);
      }
    } catch (err: any) {
      if (!showYtFallback) {
        setSourceError(err.message || 'Failed to fetch URL');
        if (isYouTubeUrl(cleanUrl)) setShowYtFallback(true);
      }
    } finally {
      setLoadingSource(false);
    }
  };

  const handleYtManualSubmit = async () => {
    if (ytManualTranscript.trim().length < 50) {
      setSourceError('Please paste at least 50 characters of transcript');
      return;
    }
    setLoadingSource(true);
    setSourceError('');
    const cleanUrl = sourceUrl.trim().startsWith('http') ? sourceUrl.trim() : `https://${sourceUrl.trim()}`;
    try {
      const { data, error } = await supabase.functions.invoke('youtube-transcript', {
        body: { url: cleanUrl, manualTranscript: ytManualTranscript.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExtractedContent(data.transcript);
      if (!topic) setTopic(data.title || '');
      setShowYtFallback(false);
    } catch (err: any) {
      setSourceError(err.message || 'Failed to process transcript');
    } finally {
      setLoadingSource(false);
    }
  };

  const handleTextSource = () => {
    if (sourceText.trim().length < 50) {
      setSourceError('Please enter at least 50 characters');
      return;
    }
    setExtractedContent(sourceText.trim());
    setSourceError('');
  };

  const clearSource = () => {
    setExtractedContent('');
    setFileName('');
    setSourceUrl('');
    setSourceText('');
    setSourceError('');
  };

  const handleGenerate = async (topicText: string) => {
    const trimmed = topicText.trim();
    if (!trimmed) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const body: any = { topic: trimmed };
      if (extractedContent && extractedContent.length > 50) {
        // Send first 15000 chars of source content
        body.sourceContent = extractedContent.slice(0, 15000);
      }

      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body,
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Roadmap generated!');
      navigate(`/roadmap/${data.topicId}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">Luminar</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            What do you want to learn?
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter a topic or add source material (PDF, URL, YouTube) for a customized roadmap.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Topic input with + button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate(topic);
            }}
            className="flex gap-3 mb-4"
          >
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setShowSourcePanel(!showSourcePanel)}
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center transition-all z-10 ${
                  showSourcePanel || hasSource
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
                title="Add source material"
              >
                {hasSource ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
              <Input
                placeholder="e.g. Machine Learning, Ancient Rome, Guitar..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-base py-6 pl-14"
                disabled={loading}
                maxLength={200}
              />
            </div>
            <Button type="submit" size="lg" className="px-6 py-6 gradient-primary border-0 shadow-glow hover:opacity-90" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          </form>

          {/* Source badge */}
          {hasSource && !showSourcePanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm border border-accent/20">
                {fileName ? <FileText className="h-3.5 w-3.5" /> : sourceUrl && isYouTubeUrl(sourceUrl) ? <Youtube className="h-3.5 w-3.5" /> : sourceUrl ? <Link className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                <span className="font-medium">
                  {fileName || (sourceUrl ? (sourceUrl.length > 40 ? sourceUrl.slice(0, 40) + '...' : sourceUrl) : 'Text source attached')}
                </span>
                <span className="text-xs text-muted-foreground">({Math.round(extractedContent.length / 1000)}k chars)</span>
                <button onClick={clearSource} className="hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Source panel */}
          <AnimatePresence>
            {showSourcePanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-5 rounded-2xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-semibold text-foreground">Add Source Material</h3>
                    <button onClick={() => setShowSourcePanel(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Source type tabs */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { type: 'file' as SourceType, icon: Upload, label: 'File' },
                      { type: 'url' as SourceType, icon: Link, label: 'URL / YouTube' },
                      { type: 'text' as SourceType, icon: FileText, label: 'Text' },
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => { setSourceType(type); setSourceError(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                          sourceType === type
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Source inputs */}
                  {sourceType === 'file' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,.docx,.doc,.md,.csv,.json,.xml"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-background hover:bg-primary/5 transition-all text-center"
                      >
                        {loadingSource ? (
                          <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        )}
                        <p className="text-foreground font-medium text-sm">{fileName || 'Click to upload'}</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD · Max 20MB</p>
                      </button>
                      {fileName && extractedContent && (
                        <p className="text-sm text-success mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Loaded: {fileName}
                        </p>
                      )}
                    </div>
                  )}

                  {sourceType === 'url' && (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://example.com or YouTube URL"
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={handleUrlSource} disabled={loadingSource || !sourceUrl.trim()} size="sm">
                          {loadingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
                        </Button>
                      </div>
                      {sourceUrl && isYouTubeUrl(sourceUrl) && !extractedContent && (
                        <p className="text-sm text-accent mt-2 flex items-center gap-1">
                          <Youtube className="h-4 w-4" /> YouTube detected — transcript will be extracted
                        </p>
                      )}
                      {extractedContent && sourceUrl && (
                        <p className="text-sm text-success mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Content fetched successfully
                        </p>
                      )}
                    </div>
                  )}

                  {sourceType === 'text' && (
                    <div>
                      <Textarea
                        placeholder="Paste your study notes, article content, etc..."
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        rows={5}
                        className="resize-none mb-2"
                      />
                      <Button onClick={handleTextSource} disabled={sourceText.trim().length < 50} size="sm" variant="outline">
                        <Check className="h-3.5 w-3.5 mr-1" /> Attach Text
                      </Button>
                      {extractedContent && sourceType === 'text' && (
                        <p className="text-sm text-success mt-2 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Text attached
                        </p>
                      )}
                    </div>
                  )}

                  {sourceError && (
                    <p className="text-sm text-destructive mt-3 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> {sourceError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Generating your learning roadmap...</p>
              <p className="text-muted-foreground text-sm mt-1">This may take a few seconds</p>
            </motion.div>
          )}

          {!loading && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Or try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setTopic(s);
                      handleGenerate(s);
                    }}
                    className="px-4 py-2 rounded-full bg-card border border-border text-sm text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
