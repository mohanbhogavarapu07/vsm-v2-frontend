import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createWorkflowStage, classifyWorkflowStage } from './workflowApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2),
  systemCategory: z.enum(['ACTIVE', 'REVIEW', 'VALIDATION', 'DONE', 'BLOCKED', 'BACKLOG']),
  intentTag: z.string().optional(),
  scopeType: z.enum(['PROJECT', 'TEAM']),
  isBlocking: z.boolean()
});

export function AddStageForm({ projectId, maxOrder, onClose }: { projectId: string, maxOrder: number, onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      systemCategory: 'ACTIVE' as any,
      intentTag: '',
      scopeType: 'PROJECT' as any,
      isBlocking: false
    }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => createWorkflowStage(projectId, { ...data, positionOrder: maxOrder + 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowGraph', projectId] });
      toast.success('Stage added');
      onClose();
    },
    onError: () => toast.error('Failed to create stage')
  });

  const [isClassifying, setIsClassifying] = useState(false);

  const handleClassify = async () => {
    const stageName = form.getValues('name');
    if (!stageName || stageName.length < 2) {
      toast.error('Please enter a valid Stage Name first');
      return;
    }
    
    try {
      setIsClassifying(true);
      const res = await classifyWorkflowStage(projectId, stageName);
      form.setValue('systemCategory', res.systemCategory as any);
      form.setValue('intentTag', res.intentTag);
      toast.success(`AI Classified: ${res.systemCategory}`, {
        description: `Intent: ${res.intentTag} (${Math.round(res.confidence * 100)}% confidence). ${res.reasoning}`
      });
    } catch (e: any) {
      toast.error('Auto-classify failed', { description: e.message });
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 border p-4 rounded-md bg-card">
      <div>
        <Label>Stage Name</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input {...form.register('name')} placeholder="e.g. Code Review" className="flex-1" />
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            onClick={handleClassify}
            disabled={isClassifying}
            title="Auto-classify category and intent"
          >
            {isClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
          </Button>
        </div>
      </div>
      <div>
        <Label>System Category</Label>
        <Controller
          name="systemCategory"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {['BACKLOG', 'ACTIVE', 'REVIEW', 'VALIDATION', 'DONE', 'BLOCKED'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div>
        <Label>Intent Tag (Optional)</Label>
        <Input {...form.register('intentTag')} placeholder="e.g. SECURITY" className="mt-1" />
      </div>
      <div>
        <Label className="block mb-2">Scope</Label>
        <Controller
          name="scopeType"
          control={form.control}
          render={({ field }) => (
            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PROJECT" id="r1" />
                <Label htmlFor="r1">Project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TEAM" id="r2" />
                <Label htmlFor="r2">Team</Label>
              </div>
            </RadioGroup>
          )}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Is Blocking</Label>
        <Controller
          name="isBlocking"
          control={form.control}
          render={({ field }) => (
             <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1" disabled={mutation.isPending}>Add Stage</Button>
      </div>
    </form>
  );
}
