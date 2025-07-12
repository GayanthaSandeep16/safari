"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
import { nanoid } from "nanoid";
import { useQuery } from "convex/react";

interface Member {
  name: string;
  country: string;
  age: number;
  gender: "male" | "female";
  phone: string;
}

export default function CreateSafariGroupPage() {
  // Renamed for clarity
  const router = useRouter();
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [hasGuide, setHasGuide] = useState(false);
  const [isShared, setIsShared] = useState(false); // New field for group sharing
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState<Member>({
    name: "",
    country: "",
    age: 0,
    gender: "male",
    phone: "",
  });
  const [leadPhone, setLeadPhone] = useState(""); // New field for lead user's phone number

  const createSafari = useMutation(api.mutations.createSafari);
  const createGroup = useMutation(api.mutations.createGroup);
  const createBooking = useMutation(api.mutations.createBooking);
  const createPayment = useMutation(api.mutations.createPayment);
  const updateGroupWithMembersAndPassengers = useMutation(
    api.mutations.updateGroupWithMembersAndPassengers
  );

  const users = useQuery(api.queries.getUsers) || [];
  const convexUser = users.find((u) => u.clerkId === userId);

  if (!convexUser) {
    toast.error("User not found in Convex database.");
    return null;
  }

  const handleAddMember = () => {
    // Max capacity logic is applied at the group creation,
    // but we can add a client-side check here for UX.
    const maxAdditionalMembers = (hasGuide ? 7 : 6) - 1; // Subtract 1 for the lead user
    if (members.length >= maxAdditionalMembers) {
      toast.error(
        `Maximum ${maxAdditionalMembers} additional members allowed for this group size.`
      );
      return;
    }

    if (
      !newMember.name ||
      !newMember.country ||
      newMember.age <= 0 
    ) {
      toast.error(
        "Please fill all member details: Name, Country, Age, Gender, and Phone."
      );
      return;
    }
    setMembers([...members, newMember]);
    setNewMember({ name: "", country: "", age: 0, gender: "male", phone: "" }); // Reset form
  };

  const handleCreateSafariGroup = async () => {
    if (!convexUser._id || !selectedDate || !title || !leadPhone) {
      toast.error("Required fields missing", {
        description: "Please provide date, title, and your phone number.",
      });
      return;
    }

    const maxCapacity = hasGuide ? 7 : 6;
    const currentSize = members.length + 1; // Lead + additional members

    if (currentSize > maxCapacity) {
      toast.error(
        `Group size (${currentSize}) exceeds maximum capacity of ${maxCapacity}.`
      );
      return;
    }

    try {
      // 1. Create Safari
      const safariId = await createSafari({
        date: format(selectedDate, "yyyy-MM-dd"),
        title,
        description,
        maxCapacity,
        basePrice,
        userId: convexUser._id,
        status: "active",
        isShared,
      });

      // 2. Create Payment for the lead user (assuming lead pays for their spot initially)
      // You might need more sophisticated payment logic if members pay individually later.
      const paymentId = await createPayment({
        userId: convexUser._id,
        amount: basePrice, // Assuming lead pays for their own basePrice initially
        currency: "USD",
        method: "Stripe (example)", // Example method
        status: "completed", // Assuming instant completion for this example
        transactionId: nanoid(), // Generate a unique transaction ID
        timestamp: new Date().toISOString(),
      });

      // 3. Create Booking for the group lead
      const bookingId = await createBooking({
        safariId,
        userId:convexUser._id,
        bookingType: "group", // Lead's booking is part of a group
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });

      // 4. Create Group
      const groupId = await createGroup({
        safariId,
        leadId: convexUser._id,
        hasGuide,
        maxSize: maxCapacity,
        joinFee: basePrice, // The fee for others to join
      });

      // 5. Update Group with non-user members and create Passengers
      // This mutation also creates the lead user's passenger entry
      await updateGroupWithMembersAndPassengers({
        groupId,
        bookingId,
        leadUserId: convexUser._id,
        leadPhone,
        members, // Pass the array of non-user members
        maxCapacity, // Pass maxCapacity to determine status within the mutation
      });

      // Reset form fields
      setSelectedDate(undefined);
      setTitle("");
      setDescription("");
      setHasGuide(false);
      setIsShared(false);
      setMembers([]);
      setNewMember({
        name: "",
        country: "",
        age: 0,
        gender: "male",
        phone: "",
      });
      setLeadPhone("");

      toast.success("Safari group created!", {
        description: `Your safari "${title}" is scheduled for ${format(selectedDate, "PPP")}. Group ID: ${groupId}`,
      });
      router.push("/dashboard"); // Redirect after successful creation
    } catch (error) {
      console.error("Failed to create safari group:", error);
      toast.error("Failed to create safari group", {
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
            <h1 className="text-3xl font-bold">Create Safari Group</h1>
            <p className="text-muted-foreground">
              Set up a new safari adventure with your group.
            </p>
          </div>
        </div>

        {/* Safari Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Safari Details</CardTitle>
            <CardDescription>
              Provide the core information for your safari.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="safariDate">Safari Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="safariDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
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
              <Label htmlFor="title">Safari Title</Label>
              <Input
                id="title"
                placeholder="e.g., Serengeti Wildlife Expedition"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe your safari, special interests, or itinerary highlights."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="leadPhone">Your Mobile Phone Number</Label>
              <Input
                id="leadPhone"
                placeholder="e.g., +1234567890"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Input
                id="hasGuide"
                type="checkbox"
                checked={hasGuide}
                onChange={(e) => setHasGuide(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="hasGuide">
                Include a professional guide (max 7 people total)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Input
                id="isShared"
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isShared">
                Allow others to join this group (make it public)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Add Members Card */}
        <Card>
          <CardHeader>
            <CardTitle>Add Group Members</CardTitle>
            <CardDescription>
              Add additional individuals who will be joining your safari group.
              (Max {hasGuide ? 6 : 5} non-user members allowed, plus yourself)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Member Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newMemberName">Member Name</Label>
                <Input
                  id="newMemberName"
                  placeholder="Full name"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newMemberCountry">Country</Label>
                <Input
                  id="newMemberCountry"
                  placeholder="Country of residence"
                  value={newMember.country}
                  onChange={(e) =>
                    setNewMember({ ...newMember, country: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newMemberAge">Age</Label>
                <Input
                  id="newMemberAge"
                  type="number"
                  placeholder="Age"
                  value={newMember.age || ""}
                  onChange={(e) =>
                    setNewMember({ ...newMember, age: Number(e.target.value) })
                  }
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newMemberGender">Gender</Label>
                <Select
                  value={newMember.gender}
                  onValueChange={(value: "male" | "female") =>
                    setNewMember({ ...newMember, gender: value })
                  }
                >
                  <SelectTrigger id="newMemberGender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="newMemberPhone">Member Phone Number</Label>
                <Input
                  id="newMemberPhone"
                  placeholder="e.g., +1234567890"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <Button onClick={handleAddMember} className="w-full">
              Add Member to Group
            </Button>

            {/* List of Added Members */}
            {members.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-lg font-semibold">
                  Current Group Members (Excluding Yourself):
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {members.map((member, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {member.name} ({member.gender}, {member.age} yrs, from{" "}
                      {member.country}, Phone: {member.phone})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Group Button */}
        <div className="pt-6">
          <Button
            onClick={handleCreateSafariGroup}
            className="w-full h-12 text-lg"
          >
            Finalize and Create Safari Group
          </Button>
        </div>
      </div>
    </div>
  );
}
