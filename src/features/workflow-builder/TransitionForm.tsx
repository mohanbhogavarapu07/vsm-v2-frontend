import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createWorkflowTransition } from './workflowApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const schema = z.object({
  fromStageId: z.coerce.number(),
  toStageId: z.coerce.number(),
  triggerType: z.enum(['GITHUB_EVENT', 'MANUAL', 'TIMER', 'CONDITION_MET']),
  githubEventType: z.string().optional()
}).refine(data => {
  if (data.triggerType === 'GITHUB_EVENT' && !data.githubEventType) {
    return false;
  }
  return true;
}, { message: "GitHub Event Type is required when trigger is GITHUB_EVENT", path: ["githubEventType"] });

export function TransitionForm({ projectId, stages, onClose }: { projectId: string, stages: any[], onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fromStageId: '' as any,
      toStageId: '' as any,
      triggerType: 'MANUAL' as any,
      githubEventType: ''
    }
  });

  const watchTriggerType = form.watch('triggerType');

  const mutation = useMutation({
    mutationFn: (data: any) => createWorkflowTransition(projectId, { 
      ...data, 
      directionType: 'FORWARD', // Default for simplicity
      conditions: [],
      postActions: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowGraph', projectId] });
      toast.success('Transition added');
      onClose();
    },
    onError: () => toast.error('Failed to create transition. Duplicate or invalid?')
  });

  return (
    <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 border p-4 rounded-md bg-card">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>From Stage</Label>
          <Controller
            name="fromStageId"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Stage" /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>To Stage</Label>
          <Controller
            name="toStageId"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Stage" /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div>
        <Label>Trigger Type</Label>
        <Controller
          name="triggerType"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual (UI)</SelectItem>
                <SelectItem value="GITHUB_EVENT">GitHub Webhook</SelectItem>
                <SelectItem value="TIMER">Timer Logic</SelectItem>
                <SelectItem value="CONDITION_MET">Condition Met</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {watchTriggerType === 'GITHUB_EVENT' && (
        <div>
          <Label>GitHub Event Type</Label>
          <Input 
             {...form.register('githubEventType')} 
             placeholder="e.g. pull_request.opened" 
             className="mt-1"
             list="github-events" 
          />
          <datalist id="github-events">
             <option value="pull_request.opened" />
             <option value="push" />
             <option value="pull_request.merged" />
             <option value="pull_request_review.submitted" />
             <option value="check_run.completed" />
          </datalist>
          {form.formState.errors.githubEventType && <p className="text-xs text-red-500 mt-1">{form.formState.errors.githubEventType.message as string}</p>}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1" disabled={mutation.isPending}>Add Transition</Button>
      </div>
    </form>
  );
}
