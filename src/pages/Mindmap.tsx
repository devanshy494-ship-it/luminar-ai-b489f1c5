import { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MindmapBranch {
  label: string;
  description?: string;
  color: string;
  children?: {
    label: string;
    description?: string;
    children?: { label: string; description?: string }[];
  }[];
}

interface MindmapData {
  title: string;
  branches: MindmapBranch[];
}

const BRANCH_COLORS: Record<string, { bg: string; border: string; text: string; edge: string }> = {
  blue: { bg: 'hsl(210 90% 95%)', border: 'hsl(210 90% 50%)', text: 'hsl(210 90% 25%)', edge: 'hsl(210 90% 50%)' },
  purple: { bg: 'hsl(270 80% 95%)', border: 'hsl(270 80% 50%)', text: 'hsl(270 80% 25%)', edge: 'hsl(270 80% 50%)' },
  green: { bg: 'hsl(140 70% 93%)', border: 'hsl(140 70% 40%)', text: 'hsl(140 70% 20%)', edge: 'hsl(140 70% 40%)' },
  orange: { bg: 'hsl(30 90% 93%)', border: 'hsl(30 90% 50%)', text: 'hsl(30 90% 25%)', edge: 'hsl(30 90% 50%)' },
  red: { bg: 'hsl(0 80% 95%)', border: 'hsl(0 80% 50%)', text: 'hsl(0 80% 25%)', edge: 'hsl(0 80% 50%)' },
  teal: { bg: 'hsl(180 70% 93%)', border: 'hsl(180 70% 40%)', text: 'hsl(180 70% 20%)', edge: 'hsl(180 70% 40%)' },
  pink: { bg: 'hsl(330 80% 95%)', border: 'hsl(330 80% 50%)', text: 'hsl(330 80% 25%)', edge: 'hsl(330 80% 50%)' },
  indigo: { bg: 'hsl(240 70% 95%)', border: 'hsl(240 70% 50%)', text: 'hsl(240 70% 25%)', edge: 'hsl(240 70% 50%)' },
};

function getColor(colorName: string) {
  return BRANCH_COLORS[colorName] || BRANCH_COLORS.blue;
}

function buildNodesAndEdges(data: MindmapData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Central node
  nodes.push({
    id: 'center',
    position: { x: 0, y: 0 },
    data: { label: data.title },
    type: 'default',
    style: {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      border: '3px solid hsl(var(--primary))',
      borderRadius: '16px',
      padding: '16px 24px',
      fontSize: '16px',
      fontWeight: '700',
      boxShadow: '0 4px 24px -6px hsl(var(--primary) / 0.4)',
      minWidth: '180px',
      textAlign: 'center' as const,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const branchCount = data.branches.length;
  const angleStep = (2 * Math.PI) / branchCount;
  const level1Radius = 350;
  const level2Radius = 250;
  const level3Radius = 180;

  data.branches.forEach((branch, bi) => {
    const angle = angleStep * bi - Math.PI / 2;
    const bx = Math.cos(angle) * level1Radius;
    const by = Math.sin(angle) * level1Radius;
    const branchId = `b-${bi}`;
    const color = getColor(branch.color);

    // Level 1 node
    nodes.push({
      id: branchId,
      position: { x: bx, y: by },
      data: {
        label: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>{branch.label}</div>
            {branch.description && (
              <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', maxWidth: '160px' }}>{branch.description}</div>
            )}
          </div>
        ),
      },
      style: {
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: '14px',
        padding: '12px 16px',
        color: color.text,
        minWidth: '120px',
        maxWidth: '200px',
      },
    });

    edges.push({
      id: `e-center-${branchId}`,
      source: 'center',
      target: branchId,
      style: { stroke: color.edge, strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: color.edge, width: 16, height: 16 },
      animated: true,
    });

    // Level 2 children
    if (branch.children) {
      const childCount = branch.children.length;
      const childAngleSpread = Math.min(0.6, (childCount - 1) * 0.15);
      
      branch.children.forEach((child, ci) => {
        const childAngle = angle + (ci - (childCount - 1) / 2) * childAngleSpread;
        const cx = bx + Math.cos(childAngle) * level2Radius;
        const cy = by + Math.sin(childAngle) * level2Radius;
        const childId = `b-${bi}-c-${ci}`;

        nodes.push({
          id: childId,
          position: { x: cx, y: cy },
          data: {
            label: (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 500, fontSize: '12px' }}>{child.label}</div>
                {child.description && (
                  <div style={{ fontSize: '9px', opacity: 0.65, marginTop: '3px', maxWidth: '130px' }}>{child.description}</div>
                )}
              </div>
            ),
          },
          style: {
            background: color.bg,
            border: `1.5px solid ${color.border}`,
            borderRadius: '10px',
            padding: '8px 12px',
            color: color.text,
            opacity: 0.9,
            minWidth: '90px',
            maxWidth: '170px',
          },
        });

        edges.push({
          id: `e-${branchId}-${childId}`,
          source: branchId,
          target: childId,
          style: { stroke: color.edge, strokeWidth: 1.5, opacity: 0.7 },
        });

        // Level 3 leaves
        if (child.children) {
          child.children.forEach((leaf, li) => {
            const leafAngle = childAngle + (li - (child.children!.length - 1) / 2) * 0.3;
            const lx = cx + Math.cos(leafAngle) * level3Radius;
            const ly = cy + Math.sin(leafAngle) * level3Radius;
            const leafId = `b-${bi}-c-${ci}-l-${li}`;

            nodes.push({
              id: leafId,
              position: { x: lx, y: ly },
              data: {
                label: (
                  <div style={{ textAlign: 'center', fontSize: '11px' }}>
                    {leaf.label}
                  </div>
                ),
              },
              style: {
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: '8px',
                padding: '6px 10px',
                color: color.text,
                opacity: 0.75,
                fontSize: '11px',
                maxWidth: '140px',
              },
            });

            edges.push({
              id: `e-${childId}-${leafId}`,
              source: childId,
              target: leafId,
              style: { stroke: color.edge, strokeWidth: 1, opacity: 0.5 },
            });
          });
        }
      });
    }
  });

  return { nodes, edges };
}

export default function Mindmap() {
  const location = useLocation();
  const navigate = useNavigate();
  const mindmapData: MindmapData | null = location.state?.mindmap || null;
  const fromTopic: string | null = location.state?.fromTopic || null;
  const topicId: string | null = location.state?.topicId || null;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!mindmapData) return { initialNodes: [], initialEdges: [] };
    const { nodes, edges } = buildNodesAndEdges(mindmapData);
    return { initialNodes: nodes, initialEdges: edges };
  }, [mindmapData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
  }, [selectedNode]);

  if (!mindmapData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No mindmap data. Generate a mindmap first.</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 glass-nav sticky top-0 z-50 shrink-0">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center neon-glow-sm">
              <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">Luminar</span>
            <span className="text-muted-foreground mx-2">·</span>
            <span className="text-sm text-muted-foreground font-medium">{mindmapData.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {topicId && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/roadmap/${topicId}`)}>
                Back to Roadmap
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate(topicId ? `/roadmap/${topicId}` : '/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {topicId ? 'Back' : 'Dashboard'}
            </Button>
          </div>
        </div>
      </nav>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
          <Controls
            showInteractive={false}
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              const style = node.style as any;
              return style?.background || 'hsl(var(--muted))';
            }}
            maskColor="hsl(var(--background) / 0.8)"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
            }}
          />
        </ReactFlow>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-20 left-4 p-3 rounded-xl glass-card border border-border/50 text-xs max-w-[200px]"
        >
          <p className="font-semibold text-foreground mb-2">Navigation</p>
          <div className="space-y-1 text-muted-foreground">
            <p>🖱 Scroll to zoom</p>
            <p>🖱 Drag to pan</p>
            <p>🖱 Drag nodes to rearrange</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
