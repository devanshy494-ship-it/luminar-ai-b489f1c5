import { useState } from 'react';
import { Download, FileText, Loader2, BookOpen, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ExtraMaterial {
  name: string;
  url: string;
  description: string;
}

interface ExtraMaterials {
  videos: ExtraMaterial[];
  websites: ExtraMaterial[];
  books: ExtraMaterial[];
  apps: ExtraMaterial[];
  other: ExtraMaterial[];
}

interface Step {
  title: string;
  description: string;
  estimatedTime: string;
  completed: boolean;
  order: number;
}

interface LessonData {
  sections: { heading: string; content: string }[];
  keyTakeaways: string[];
}

interface NotionExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicTitle: string;
  steps: Step[];
  progress: number;
  extraMaterials: Record<number, ExtraMaterials>;
  lessons: Record<number, LessonData>;
  stepIndex?: number | null; // null = full export, number = single step
}

function generateRoadmapMarkdown(topicTitle: string, steps: Step[], progress: number): string {
  let md = `# 🗺️ Roadmap: ${topicTitle}\n\n`;
  md += `**Progress:** ${progress}%\n\n---\n\n`;

  steps.forEach((step, i) => {
    const status = step.completed ? '✅' : '⬜';
    md += `## ${status} Step ${i + 1}: ${step.title}\n\n`;
    md += `${step.description}\n\n`;
    if (step.estimatedTime) {
      md += `⏱️ *Estimated time: ${step.estimatedTime}*\n\n`;
    }
    md += `---\n\n`;
  });

  return md;
}

function generateStepMarkdown(
  topicTitle: string,
  step: Step,
  stepIndex: number,
  lesson?: LessonData,
  materials?: ExtraMaterials
): string {
  let md = `# Step ${stepIndex + 1}: ${step.title}\n\n`;
  md += `*Part of: ${topicTitle}*\n\n`;
  md += `${step.description}\n\n`;
  if (step.estimatedTime) {
    md += `⏱️ *Estimated time: ${step.estimatedTime}*\n\n`;
  }

  if (lesson) {
    md += `---\n\n## 📖 Lesson\n\n`;
    lesson.sections.forEach((section) => {
      md += `### ${section.heading}\n\n${section.content}\n\n`;
    });
    if (lesson.keyTakeaways.length > 0) {
      md += `### 🔑 Key Takeaways\n\n`;
      lesson.keyTakeaways.forEach((t) => {
        md += `- ${t}\n`;
      });
      md += `\n`;
    }
  }

  if (materials) {
    const categoryConfig = [
      { key: 'videos' as const, emoji: '🎥', label: 'Videos' },
      { key: 'websites' as const, emoji: '🌐', label: 'Websites' },
      { key: 'books' as const, emoji: '📖', label: 'Books' },
      { key: 'apps' as const, emoji: '📱', label: 'Apps' },
      { key: 'other' as const, emoji: '📌', label: 'Other' },
    ];
    const hasContent = categoryConfig.some((c) => materials[c.key]?.length > 0);
    if (hasContent) {
      md += `---\n\n## 📚 Extra Materials\n\n`;
      categoryConfig.forEach(({ key, emoji, label }) => {
        const items = materials[key];
        if (!items || items.length === 0) return;
        md += `### ${emoji} ${label}\n\n`;
        items.forEach((item) => {
          md += `- **[${item.name}](${item.url})**\n`;
          if (item.description) md += `  ${item.description}\n`;
        });
        md += `\n`;
      });
    }
  }

  return md;
}

function generateExtraMaterialsMarkdown(
  topicTitle: string,
  steps: Step[],
  extraMaterials: Record<number, ExtraMaterials>
): string {
  let md = `# 📚 Extra Materials: ${topicTitle}\n\n`;

  const categoryConfig = [
    { key: 'videos' as const, emoji: '🎥', label: 'Videos' },
    { key: 'websites' as const, emoji: '🌐', label: 'Websites' },
    { key: 'books' as const, emoji: '📖', label: 'Books' },
    { key: 'apps' as const, emoji: '📱', label: 'Apps' },
    { key: 'other' as const, emoji: '📌', label: 'Other' },
  ];

  let hasAny = false;

  steps.forEach((step, i) => {
    const materials = extraMaterials[i];
    if (!materials) return;

    const hasContent = categoryConfig.some(
      (cat) => materials[cat.key] && materials[cat.key].length > 0
    );
    if (!hasContent) return;

    hasAny = true;
    md += `## Step ${i + 1}: ${step.title}\n\n`;

    categoryConfig.forEach(({ key, emoji, label }) => {
      const items = materials[key];
      if (!items || items.length === 0) return;

      md += `### ${emoji} ${label}\n\n`;
      items.forEach((item) => {
        md += `- **[${item.name}](${item.url})**\n`;
        if (item.description) {
          md += `  ${item.description}\n`;
        }
      });
      md += `\n`;
    });

    md += `---\n\n`;
  });

  if (!hasAny) {
    md += `*No extra materials have been loaded yet. Open "Extra Materials" for each step in the roadmap first, then export.*\n`;
  }

  return md;
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function NotionExportDialog({
  open,
  onOpenChange,
  topicTitle,
  steps,
  progress,
  extraMaterials,
}: NotionExportDialogProps) {
  const [exportRoadmap, setExportRoadmap] = useState(true);
  const [exportMaterials, setExportMaterials] = useState(true);
  const [exporting, setExporting] = useState(false);

  const materialsCount = Object.keys(extraMaterials).length;
  const hasMaterials = materialsCount > 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      const safeName = topicTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-');

      if (exportRoadmap) {
        const roadmapMd = generateRoadmapMarkdown(topicTitle, steps, progress);
        downloadMarkdown(`Roadmap-${safeName}.md`, roadmapMd);
      }

      if (exportMaterials && hasMaterials) {
        const materialsMd = generateExtraMaterialsMarkdown(topicTitle, steps, extraMaterials);
        downloadMarkdown(`Extra-Materials-${safeName}.md`, materialsMd);
      }

      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 300));
      onOpenChange(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export for Notion
          </DialogTitle>
          <DialogDescription>
            Download Markdown files formatted for Notion. Import them via Notion's{' '}
            <strong>"Import"</strong> feature to preserve full structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Roadmap checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
            <Checkbox
              checked={exportRoadmap}
              onCheckedChange={(v) => setExportRoadmap(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Roadmap
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {steps.length} steps with descriptions, progress, and status
              </p>
            </div>
          </label>

          {/* Extra Materials checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
            <Checkbox
              checked={exportMaterials}
              onCheckedChange={(v) => setExportMaterials(v === true)}
              disabled={!hasMaterials}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Library className="h-4 w-4 text-primary" />
                Extra Materials
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasMaterials
                  ? `Resources loaded for ${materialsCount} of ${steps.length} steps`
                  : 'No materials loaded yet — open "Extra Materials" per step first'}
              </p>
            </div>
          </label>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              In Notion: click <strong>···</strong> → <strong>Import</strong> → select the downloaded
              <strong> .md</strong> file(s). Structure, headings, and links will be preserved.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || (!exportRoadmap && !exportMaterials) || (!exportRoadmap && !hasMaterials)}
            size="sm"
            variant="glow"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download {[exportRoadmap && 'Roadmap', exportMaterials && hasMaterials && 'Materials'].filter(Boolean).join(' & ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
