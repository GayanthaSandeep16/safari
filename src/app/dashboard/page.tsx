// src/app/dashboard/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Share2, MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { userId } = useAuth();
  const user = await currentUser();

  if (!userId || !user) {
    return redirect('/');
  }

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/+1234567890", "_blank");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Safari Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.firstName}!</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleWhatsAppContact}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <img src={user.imageUrl} alt="Profile" className="w-16 h-16 rounded-full" />
              <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-muted-foreground">{user.emailAddresses[0].emailAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="safaris">Safaris</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => redirect("/safari")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Safari Dates
                  </CardTitle>
                  <CardDescription>Select and manage your safari dates</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Manage Safaris</Button>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => redirect("/groups")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Groups
                  </CardTitle>
                  <CardDescription>Create or join safari groups</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Manage Groups</Button>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => redirect("/share")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share & Invite
                  </CardTitle>
                  <CardDescription>Share safaris and invite others</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Share Safaris</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="safaris">
            <Card>
              <CardHeader>
                <CardTitle>Your Safaris</CardTitle>
                <CardDescription>Quick overview of your safari bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No safaris booked yet.</p>
                <Button className="mt-4" onClick={() => redirect("/safari")}>
                  Book Your First Safari
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Your Groups</CardTitle>
                <CardDescription>Groups you’ve created or joined</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No groups yet.</p>
                <Button className="mt-4" onClick={() => redirect("/groups")}>
                  Create or Join Groups
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sharing">
            <Card>
              <CardHeader>
                <CardTitle>Sharing Activity</CardTitle>
                <CardDescription>Your shared links and invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No sharing activity yet.</p>
                <Button className="mt-4" onClick={() => redirect("/share")}>
                  Start Sharing
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}