// app/(dashboard)/share/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui/index';
import { toast } from 'sonner';
import { ArrowLeft, Link } from 'lucide-react';

export default function SharePage() {
  const { user } = useUser();
  const router = useRouter();
  const groups = useQuery(api.queries.getGroupsByUser, { userId: user?.id as Id<'users'> }) || [];
  const generateShareLink = useMutation(api.mutations.generateShareLink);

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [shareLink, setShareLink] = useState('');

  const handleGenerateLink = async () => {
    if (!selectedGroup || !user) {
      toast.error('Please select a group and ensure you are logged in.');
      return;
    }
    try {
      const token = await generateShareLink({ groupId: selectedGroup as Id<'groups'> });
      const link = `${window.location.origin}/join/${token}`;
      setShareLink(link);
      toast.success('Share link generated!');
    } catch (error) {
      toast.error('Failed to generate share link');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Share Safaris</h1>
            <p className="text-muted-foreground">Generate shareable links for your groups</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate Share Link</CardTitle>
            <CardDescription>Create a link to invite others to your group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Group</Label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.safariId} ({group.status})
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleGenerateLink} className="w-full">
              Generate Link
            </Button>
            {shareLink && (
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex items-center gap-2">
                  <Input value={shareLink} readOnly />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      toast.success('Link copied to clipboard!');
                    }}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}