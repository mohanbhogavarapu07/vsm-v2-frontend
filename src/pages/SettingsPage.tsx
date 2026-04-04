import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings, Users, Workflow, Shield, FolderKanban, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { projectId, teamId } = useParams<{ projectId: string; teamId?: string }>();
  const { currentProject, teams, roles, workflowStages } = useProjectStore();
  const navigate = useNavigate();

  const currentTeam = teams.find(t => t.id === teamId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {projectId ? `Manage settings for ${currentProject?.name || 'Project'}` : 'Manage your account and preferences'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-4xl">
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="bg-muted/50 border border-border p-1">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </TabsTrigger>
              {projectId && (
                <TabsTrigger value="project" className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Project
                </TabsTrigger>
              )}
              {teamId && (
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="account" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={(user as any)?.user_metadata?.full_name || ''} readOnly className="bg-muted" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>Backend connection settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Backend API URL</Label>
                    <Input
                      value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
                      readOnly
                      className="bg-muted font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Set via VITE_API_BASE_URL environment variable
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {projectId && (
              <TabsContent value="project" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Basic information about this project</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Project Name</Label>
                      <Input value={currentProject?.name || ''} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button size="sm">Update Project</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Wizard</CardTitle>
                    <CardDescription>Relaunch the step-by-step setup guide</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Need to add more roles or teams? You can relaunch the configuration wizard at any time.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/projects/${projectId}/setup`)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Launch Wizard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {teamId && (
              <TabsContent value="team" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>Team: {currentTeam?.name}</CardTitle>
                    <CardDescription>Manage roles and workflow for this team</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-semibold">Roles ({roles.length})</h4>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {roles.map(role => (
                          <div key={role.id} className="rounded-md border p-2 text-xs flex justify-between bg-muted/30">
                            <span>{role.name}</span>
                            <span className="text-muted-foreground">{role.access_level}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-semibold">Workflow Stages ({workflowStages.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {workflowStages.sort((a,b) => a.stage_order - b.stage_order).map(stage => (
                          <div key={stage.id} className="rounded-full border px-3 py-1 text-xs bg-muted/30">
                            {stage.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button variant="link" onClick={() => navigate(`/projects/${projectId}/setup`)}>
                        Manage Detailed Config
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
