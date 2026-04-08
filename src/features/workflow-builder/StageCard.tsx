import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateWorkflowStage } from './workflowApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2),
  slaDurationMinutes: z.coerce.number().nullable().optional(),
  requiresApprovalToExit: z.boolean(),
  isBlocking: z.boolean()
});

export function StageCard({ projectId, stage }: { projectId: string, stage: any }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: stage.name,
      slaDurationMinutes: stage.slaDurationMinutes || '',
      requiresApprovalToExit: stage.requiresApprovalToExit,
      isBlocking: stage.isBlocking,
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateWorkflowStage(projectId, stage.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowGraph', projectId] });
      setIsEditing(false);
      toast.success('Stage updated');
    },
    onError: () => toast.error('Failed to update stage')
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({ ...data, slaDurationMinutes: data.slaDurationMinutes || null });
  };

  if (isEditing) {
    return (
      <Card className="mb-3 border-primary shadow-sm bg-card">
        <CardContent className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Input {...form.register('name')} placeholder="Stage Name" className="h-8" />
            <div className="flex items-center justify-between text-sm">
                <label>SLA (mins)</label>
                <Input type="number" {...form.register('slaDurationMinutes')} className="w-20 h-8" />
            </div>
            <div className="flex items-center justify-between text-sm">
                <label>Requires Approval</label>
                <Switch 
                  checked={form.watch('requiresApprovalToExit')}
                  onCheckedChange={(v) => form.setValue('requiresApprovalToExit', v)}
                />
            </div>
             <div className="flex items-center justify-between text-sm">
                <label>Is Blocking</label>
                <Switch 
                  checked={form.watch('isBlocking')}
                  onCheckedChange={(v) => form.setValue('isBlocking', v)}
                />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-3 border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setIsEditing(true)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
           <h4 className="font-semibold text-sm">{stage.name}</h4>
           <div className="flex gap-1">
             <Badge variant="secondary" className="text-[10px]">{stage.positionOrder}</Badge>
           </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
           <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] border-none">{stage.systemCategory}</Badge>
           {stage.intentTag && <Badge variant="outline" className="text-[10px]">{stage.intentTag}</Badge>}
           {stage.isBlocking && <Badge variant="destructive" className="text-[10px]">Blocking</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
