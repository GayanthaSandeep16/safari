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
  // Renamed for clarity
  const router = useRouter();
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState(100);
  const [selectedSafariToJoin, setSelectedSafariToJoin] = useState<string>(""); // Renamed for clarity
  const [userCountry, setUserCountry] = useState(""); // Renamed for clarity
  const [userGender, setUserGender] = useState<"male" | "female" | "">(""); // Renamed for clarity
  const [userPhone, setUserPhone] = useState(""); // Added for individual booking

  // Safaris that are active AND have shared groups
  const availableSafarisForJoining =
    useQuery(api.queries.getSafarisForJoining, { status: "active" }) || [];
  // Groups that the current user is a member of (for "Your Groups" section)
  const userGroups =
    useQuery(api.queries.getGroupsByUser, userId ? { userId } : "skip") || [];

  const createSafari = useMutation(api.mutations.createSafari); // For individual safari creation
  const createBooking = useMutation(api.mutations.createBooking);
  const createPayment = useMutation(api.mutations.createPayment);
  const joinGroup = useMutation(api.mutations.joinGroup); // Corrected to use shareToken

  // 1. Fetch the Convex user by Clerk ID
  const users = useQuery(api.queries.getUsers) || [];
  const convexUser = users.find((u) => u.clerkId === userId);

  // 2. Use convexUser?._id as the userId for Convex mutations
  if (!convexUser) {
    toast.error("User not found in Convex database.");
    return;
  }

  // Placeholder for individual safari creation (if you still want it on this page)
  const handleCreateIndividualSafari = async () => {
    if (
      !convexUser ||
      !selectedDate ||
      !title ||
      !userCountry ||
      !userGender ||
      !userPhone
    ) {
      toast.error("Required fields missing", {
        description:
          "Please provide date, title, country, gender, and phone number.",
      });
      return;
    }

    try {
      const safariId = await createSafari({
        date: format(selectedDate, "yyyy-MM-dd"),
        title,
        description,
        maxCapacity: 1, // For individual booking
        basePrice,
        userId: convexUser._id,
        status: "active",
        isShared: false, // Individual safaris are not shared
      });

      await createBooking({
        safariId,
        userId: convexUser._id,
        bookingType: "individual",
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });

      // Clear form
      setSelectedDate(undefined);
      setTitle("");
      setDescription("");
      setBasePrice(100);
      setUserCountry("");
      setUserGender("");
      setUserPhone("");

      toast.success("Individual Safari Booked!", {
        description: `Your safari "${title}" is scheduled for ${format(selectedDate, "PPP")}.`,
      });
    } catch (error) {
      console.error("Failed to create individual safari:", error);
      toast.error("Failed to book individual safari", {
        description:
          (error as Error).message || "An unexpected error occurred.",
      });
    }
  };

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
      // Find the group associated with the selected safari that is open and shared
      // This implies you need a query to get groups with share tokens
      const groupToJoin = availableSafarisForJoining.find(
        (s: Doc<"safaris">) => s._id === selectedSafariToJoin
      )?.group; // Assuming your query `getSafarisForJoining` returns safari with linked group

      if (!groupToJoin) {
        toast.error(
          "No open group found for this safari, or it is not shared."
        );
        return;
      }
      if (
        groupToJoin.status !== "open" ||
        groupToJoin.currentSize >= groupToJoin.maxSize
      ) {
        toast.error("This group is not available to join (full or closed).");
        return;
      }
      if (!groupToJoin.shareToken) {
        toast.error(
          "This group does not have a share token and cannot be joined directly."
        );
        return;
      }


      // After joining the group, a booking is automatically created by the `joinGroup` mutation
      // and a passenger entry is also created there.
      // So, you don't need to call createBooking and createPassenger separately here.

      setSelectedSafariToJoin("");
      setUserCountry("");
      setUserGender("");
      setUserPhone(""); // Clear phone as well
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Safari Booking Options</h1>
            <p className="text-muted-foreground">
              Book an individual safari or join an existing group.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section for Individual Safari Booking */}
          <Card>
            <CardHeader>
              <CardTitle>Book an Individual Safari</CardTitle>
              <CardDescription>
                Plan a private safari just for yourself.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="indivSafariDate">Safari Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="indivSafariDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="indivTitle">Safari Title</Label>
                <Input
                  id="indivTitle"
                  placeholder="e.g., Solo Photo Safari"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="indivDescription">Description</Label>
                <Textarea
                  id="indivDescription"
                  placeholder="Any specific interests or notes for your guide?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="indivCountry">Your Country</Label>
                <Input
                  id="indivCountry"
                  placeholder="Your country..."
                  value={userCountry}
                  onChange={(e) => setUserCountry(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="indivGender">Your Gender</Label>
                <Select
                  value={userGender}
                  onValueChange={(value: "male" | "female") =>
                    setUserGender(value)
                  }
                >
                  <SelectTrigger id="indivGender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="indivPhone">Your Phone Number</Label>
                <Input
                  id="indivPhone"
                  placeholder="Your phone number..."
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                />
              </div>

              <Button onClick={handleCreateIndividualSafari} className="w-full">
                Book Individual Safari
              </Button>
            </CardContent>
          </Card>

          {/* Section for Joining a Public Group */}
          <Card>
            <CardHeader>
              <CardTitle>Join an Existing Group</CardTitle>
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
        </div>

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
                      // Assuming getGroupsByUser query can fetch linked safari data
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
                            {/* You might want to display names from passengers collection if available */}
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

        {/* Button to navigate to create-group page */}
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => router.push("/create-group")}
            className="w-fit px-8 py-3 text-lg"
          >
            Create a New Safari Group
          </Button>
        </div>

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
