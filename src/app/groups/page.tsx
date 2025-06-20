'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/index';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowLeft } from 'lucide-react';
import { CardDescription } from '@/components/ui/index';

// Safely initialize Stripe
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function GroupsPage() {
  const { user } = useUser();
  const router = useRouter();
  const safaris = useQuery(api.queries.getSafaris, { status: 'active' }) || [];
  
  // Pass user.id as a string, let the query handle the conversion
  const groups = useQuery(api.queries.getGroupsByUser, user ? { userId: user.id } : "skip") || [];
  const createGroup = useMutation(api.mutations.createGroup);
  const joinGroup = useMutation(api.mutations.joinGroup);

  const [selectedSafari, setSelectedSafari] = useState<string>('');
  const [hasGuide, setHasGuide] = useState(false);
  const [joinToken, setJoinToken] = useState('');

  const handleCreateGroup = async () => {
    if (!selectedSafari || !user) {
      toast.error('Please select a safari and ensure you are logged in.');
      return;
    }
    try {
      const maxSize = hasGuide ? 7 : 6;
      await createGroup({
        safariId: selectedSafari as Id<'safaris'>,
        leadId: user.id as Id<'users'>, // This might still need adjustment
        hasGuide,
        maxSize,
        joinFee: 1,
      });
      toast.success('Group created successfully!');
      setSelectedSafari('');
      setHasGuide(false);
    } catch (error) {
      toast.error('Failed to create group');
      console.error(error);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinToken || !user || !stripePromise) {
      toast.error('Please enter a valid share token, ensure you are logged in, and check Stripe configuration.');
      return;
    }
    try {
      const stripe = await stripePromise;
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: joinToken, userId: user.id }),
      });
      const { sessionId } = await response.json();
      if (stripe && sessionId) {
        await stripe.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      toast.error('Failed to join group');
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
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground">Create or join a safari group</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Group */}
          <Card>
            <CardHeader>
              <CardTitle>Create a Group</CardTitle>
              <CardDescription>Start a new safari group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Safari</Label>
                <Select value={selectedSafari} onValueChange={setSelectedSafari}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a safari" />
                  </SelectTrigger>
                  <SelectContent>
                    {safaris.map((safari) => (
                      <SelectItem key={safari._id} value={safari._id}>
                        {safari.title} ({safari.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  <Input
                    type="checkbox"
                    checked={hasGuide}
                    onChange={(e) => setHasGuide(e.target.checked)}
                  />
                  Include Guide
                </Label>
              </div>
              <Button onClick={handleCreateGroup} className="w-full">
                Create Group
              </Button>
            </CardContent>
          </Card>

          {/* Join Group */}
          <Card>
            <CardHeader>
              <CardTitle>Join a Group</CardTitle>
              <CardDescription>Use a share token to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Share Token</Label>
                <Input
                  placeholder="Enter share token"
                  value={joinToken}
                  onChange={(e) => setJoinToken(e.target.value)}
                />
              </div>
              <Button onClick={handleJoinGroup} className="w-full">
                Join Group ($1 Fee)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Group List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Groups</CardTitle>
            <CardDescription>Groups you’ve created or joined</CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No groups yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Safari</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Guide</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group._id}>
                      <TableCell>{group.safariId}</TableCell>
                      <TableCell>{group.status}</TableCell>
                      <TableCell>{group.currentSize}/{group.maxSize}</TableCell>
                      <TableCell>{group.hasGuide ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}