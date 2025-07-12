"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid"; // Added for transactionId

export default function SafariBookingPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [selectedSafariToJoin, setSelectedSafariToJoin] = useState<string>("");
  const [userCountry, setUserCountry] = useState("");
  const [userGender, setUserGender] = useState<"male" | "female" | "">("");
  const [userPhone, setUserPhone] = useState("");

  // Safaris that are active AND have shared groups
  const availableSafarisForJoining =
    useQuery(api.queries.getSafarisForJoining, { status: "active" }) || [];
  // Groups that the current user is a member of (for "Your Groups" section)
  const userGroups =
    useQuery(api.queries.getGroupsByUser, userId ? { userId } : "skip") || [];

  const joinGroup = useMutation(api.mutations.joinGroup);
  const users = useQuery(api.queries.getUsers) || [];
  const convexUser = users.find((u) => u.clerkId === userId);

  if (!convexUser) {
    toast.error("User not found in Convex database.");
    return;
  }

  const handleJoinPublicGroup = async () => {
    if (
      !selectedSafariToJoin ||
      !convexUser ||
      !userCountry ||
      !userGender ||
      !userPhone
    ) {
      toast.error(
        "Please select a safari, and provide your country, gender, and phone number."
      );
      return;
    }

    try {
      const groupToJoin = availableSafarisForJoining.find(
        (s: Doc<"safaris">) => s._id === selectedSafariToJoin
      )?.group;

      if (!groupToJoin) {
        toast.error(
          "No open group found for this safari, or it is not shared."
        );
        return;
      }
      const safariToJoin = availableSafarisForJoining.find(
        (s: Doc<"safaris">) => s._id === selectedSafariToJoin
      );

      console.log(groupToJoin.status);
      console.log(safariToJoin?.isShared);
      console.log(groupToJoin.currentSize);
      console.log(groupToJoin.maxSize);
      if (
        groupToJoin.status!== "open" ||
        !safariToJoin?.isShared ||
        groupToJoin.currentSize >= groupToJoin.maxSize
      ) {
        console.log(groupToJoin.status);
      console.log(safariToJoin?.isShared);
      console.log(groupToJoin.currentSize);
      console.log(groupToJoin.maxSize);
        toast.error("This group is not available to join (full or closed).");
        return;
      }
     

      // After joining the group, a booking is automatically created by the `joinGroup` mutation
      // and a passenger entry is also created there.
      // So, you don't need to call createBooking and createPassenger separately here.

      setSelectedSafariToJoin("");
      setUserCountry("");
      setUserGender("");
      setUserPhone("");
      toast.success("Joined group successfully!");
    } catch (error) {
      console.error("Failed to join group:", error);
      toast.error("Failed to join group", {
        description:
          (error as Error).message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Toaster />
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center mt-8 mb-12">
          {/* Create Full Safari Group */}
          <Card className="w-full md:w-1/2 shadow-lg border-2 border-primary">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex flex-col flex-1">
                <CardTitle className="flex items-center gap-2">
                  Create Full Safari Group
                  <span className="ml-2 px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-semibold">
                    Group
                  </span>
                </CardTitle>
                <CardDescription>
                  For groups of 6 people. Plan your own adventure and invite
                  your friends or family!
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full py-4 text-lg font-bold"
                onClick={() => router.push("/create-group")}
              >
                Create Full Safari Group
              </Button>
            </CardContent>
          </Card>

          {/* Join Safari Group */}
          <Card className="w-full md:w-1/2 shadow-lg border-2 border-blue-500">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex flex-col flex-1">
                <CardTitle className="flex items-center gap-2">
                  Join Safari Group
                  <span className="ml-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 font-semibold">
                    Solo Traveler
                  </span>
                </CardTitle>
                <CardDescription>
                  Perfect for solo travelers! Join an existing group and make
                  new friends on your safari.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full py-4 text-lg font-bold"
                variant="outline"
                onClick={() => setShowJoinGroup(true)}
              >
                Join Safari Group
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Join Group Form (only visible after clicking Join Safari Group) */}
        {showJoinGroup && (
          <Card className="max-w-xl mx-auto mt-8">
            <CardHeader>
              <CardTitle>Join an Existing Safari Group</CardTitle>
              <CardDescription>
                Browse and join publicly available safari groups.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinSafariSelect">Select a Safari Group</Label>
                <Select
                  value={selectedSafariToJoin}
                  onValueChange={setSelectedSafariToJoin}
                >
                  <SelectTrigger id="joinSafariSelect">
                    <SelectValue placeholder="Choose a group to join" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSafarisForJoining.map(
                      (safari: Doc<"safaris"> & { group?: Doc<"groups"> }) =>
                        safari.group &&
                        safari.group.status === "open" &&
                        safari.isShared ? (
                          <SelectItem key={safari._id} value={safari._id}>
                            {safari.title} (
                            {safari.date &&
                            !isNaN(new Date(safari.date).getTime())
                              ? format(new Date(safari.date), "PPP")
                              : "Unknown"}
                            ) - {safari.group.currentSize}/
                            {safari.group.maxSize}
                          </SelectItem>
                        ) : null
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinCountry">Your Country</Label>
                <Input
                  id="joinCountry"
                  placeholder="Your country..."
                  value={userCountry}
                  onChange={(e) => setUserCountry(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinGender">Your Gender</Label>
                <Select
                  value={userGender}
                  onValueChange={(value: "male" | "female") =>
                    setUserGender(value)
                  }
                >
                  <SelectTrigger id="joinGender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinPhone">Your Phone Number</Label>
                <Input
                  id="joinPhone"
                  placeholder="Your phone number..."
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                />
              </div>

              <Button onClick={handleJoinPublicGroup} className="w-full">
                Join Selected Group
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Your Groups (User-specific groups) */}
        <Card>
          <CardHeader>
            <CardTitle>Your Safari Groups</CardTitle>
            <CardDescription>
              Groups you are leading or have joined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userGroups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                You are not part of any groups yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Safari Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Guide</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map(
                    (group: Doc<"groups"> & { safari?: Doc<"safaris"> }) => {
                      const safari = availableSafarisForJoining.find(
                        (s: Doc<"safaris">) => s._id === group.safariId
                      );
                      const safariDate = safari?.date
                        ? new Date(safari.date)
                        : null;
                      const isValidSafariDate =
                        safariDate instanceof Date &&
                        !isNaN(safariDate.getTime());
                      return (
                        <TableRow key={group._id}>
                          <TableCell>{safari?.title || "Unknown"}</TableCell>
                          <TableCell>
                            {isValidSafariDate
                              ? format(safariDate, "PPP")
                              : "Unknown"}
                          </TableCell>
                          <TableCell>
                            {group.currentSize}/{group.maxSize}
                          </TableCell>
                          <TableCell>{group.hasGuide ? "Yes" : "No"}</TableCell>
                          <TableCell>{group.status}</TableCell>
                        </TableRow>
                      );
                    }
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Visit Website Button */}
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => window.open("https://example-safari.com", "_blank")}
          >
            Visit Our Website
          </Button>
        </div>
      </div>
    </div>
  );
}
