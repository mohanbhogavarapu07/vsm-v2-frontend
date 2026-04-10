import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { type AIDecision, useWorkflowStore } from '@/stores/workflowStore';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  AlertCircle, 
  ArrowRight, 
  Info, 
  CheckCircle2, 
  Loader2,
  ExternalLink 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AIDecisionResolutionModalProps {
  decision: AIDecision | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AIDecisionResolutionModal({ 
  decision, 
  isOpen, 
  onClose,
  onSuccess 
}: AIDecisionResolutionModalProps) {
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  
  const stages = useWorkflowStore((s) => s.stages);
  const currentTeamId = useWorkflowStore((s) => s.currentTeamId);

  useEffect(() => {
    if (isOpen && decision) {
      // Default to suggested status if available
      if (decision.toStageId) {
        setSelectedStatusId(String(decision.toStageId));
      }
      
      // Fetch full task details for context
      fetchTaskDetails();
    } else {
      setTaskDetails(null);
    }
  }, [isOpen, decision]);

  const fetchTaskDetails = async () => {
    if (!decision || !currentTeamId) return;
    setLoadingTask(true);
    try {
      const task = await api.getTask(String(decision.taskId), currentTeamId);
      setTaskDetails(task);
      // If no suggestion, default to current status
      if (!decision.toStageId && task.currentStageId) {
        setSelectedStatusId(String(task.currentStageId));
      }
    } catch (err) {
      console.error('Failed to fetch task details', err);
    } finally {
      setLoadingTask(false);
    }
  };

  const handleResolve = async () => {
    if (!decision || !selectedStatusId || !currentTeamId) return;
    
    setIsResolving(true);
    try {
      await api.resolveDecision(
        String(decision.taskId), 
        String(decision.id), 
        currentTeamId, 
        Number(selectedStatusId)
      );
      toast.success('Blocker resolved successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error('Failed to resolve blocker', { description: err.message });
    } finally {
      setIsResolving(false);
    }
  };

  if (!decision) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-card border-border shadow-2xl">
        <div className="bg-destructive/5 p-6 pb-4 border-b border-destructive/10">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-destructive/10 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-background">
                ISSUE ID: #{decision.id}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Resolve Blocker
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Review task constraints and manually override the workflow state.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Task Info Section */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Target Task
              </label>
              <div className="flex items-center justify-between group">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary">T-{decision.taskId}</span>
                  {decision.taskTitle}
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* AI Reasoning Section */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border/40">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">AI Reasoning</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {decision.reasoning}
                  </p>
                </div>
              </div>
            </div>

            {/* Task Details Section */}
            {loadingTask ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : taskDetails && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-card border border-border rounded-lg">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Current Status</p>
                  <p className="text-sm font-medium">{taskDetails.currentStage?.name || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-card border border-border rounded-lg">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Priority</p>
                  <Badge variant="outline" className="capitalize border-border/50">
                    {taskDetails.priority?.toLowerCase() || 'Normal'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-border/50" />

          {/* Action Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Resolve to New Status
              </label>
              <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                <SelectTrigger className="w-full h-12 bg-background border-border hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Select target status..." />
                </SelectTrigger>
                <SelectContent>
                  {stages.filter(s => s.systemCategory !== 'BACKLOG').map((stage) => (
                    <SelectItem key={stage.id} value={String(stage.id)}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-[11px] text-muted-foreground text-center">
              Resolving this blocker will record a manual override and update the audit feed.
            </p>
          </div>
        </div>

        <DialogFooter className="bg-muted/20 p-4 border-t border-border flex sm:justify-between items-center gap-4">
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button 
            onClick={handleResolve} 
            disabled={isResolving || !selectedStatusId}
            className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          >
            {isResolving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {isResolving ? 'Resolving...' : 'Resolve Blocker'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
