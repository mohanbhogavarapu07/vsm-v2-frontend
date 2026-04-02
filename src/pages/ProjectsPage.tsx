import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, Project } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, ArrowRight, Loader2, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, loading, fetchProjects, createProject, setCurrentProject } = useProjectStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [key, setKey] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        key: key.trim().toUpperCase() || undefined,
      });
      setOpen(false);
      setName('');
      setDescription('');
      setKey('');
      navigate(`/projects/${project.id}/setup`);
    } catch {
      // error handled in store
    } finally {
      setCreating(false);
    }
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    if (!project.setup_complete) {
      navigate(`/projects/${project.id}/setup`);
    } else {
      navigate(`/projects/${project.id}/board`);
    }
  };

  const generateKey = (projectName: string) => {
    return projectName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  };

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage your workflow projects
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new project. After creation, you'll configure team roles and invite members.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g. Mobile App Sprint"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!key) setKey(generateKey(e.target.value));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-key">Project Key</Label>
                <Input
                  id="project-key"
                  placeholder="e.g. MAS"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Short identifier used for task IDs (e.g. MAS-123)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Description (optional)</Label>
                <Textarea
                  id="project-desc"
                  placeholder="Brief description of the project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Setup Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Grid */}
      {loading && projects.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FolderKanban className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to get started with AI-powered workflows
            </p>
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
                  onClick={() => handleOpenProject(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      {!project.setup_complete && (
                        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs">
                          Setup Pending
                        </Badge>
                      )}
                      {project.setup_complete && (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-3 text-base">{project.name}</CardTitle>
                    {project.key && (
                      <span className="text-xs font-mono text-muted-foreground">{project.key}</span>
                    )}
                    {project.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(project.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
