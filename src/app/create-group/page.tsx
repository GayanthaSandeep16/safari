"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { useQuery } from "convex/react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { getData } from "country-list";
import ReactCountryFlag from "react-country-flag";

interface Country {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return "";
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt())
  );
}

interface Member {
  name: string;
  country: string;
  age: number;
  gender: "male" | "female";
  phone: string;
}

export default function CreateSafariGroupPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [hasGuide, setHasGuide] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState<Member>({
    name: "",
    country: "",
    age: 0,
    gender: "male",
    phone: "",
  });
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCountry, setLeadCountry] = useState("");

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
    const maxAdditionalMembers = (hasGuide ? 7 : 6) - 1;
    if (members.length >= maxAdditionalMembers) {
      toast.error(
        `Maximum ${maxAdditionalMembers} additional members allowed for this group size.`
      );
      return;
    }

    if (
      !newMember.name ||
      !newMember.country ||
      newMember.age <= 0 ||
      !newMember.phone
    ) {
      toast.error(
        "Please fill all member details: Name, Country, Age, Gender, and Phone."
      );
      return;
    }

    const cleanPhone = newMember.phone.replace(/[\s+]/g, "");
    if (!/^\+\d{7,15}$/.test(cleanPhone)) {
      toast.error(
        "Invalid phone number. Please enter a valid phone number with country code."
      );
      return;
    }

    setMembers([...members, newMember]);
    setNewMember({ name: "", country: "", age: 0, gender: "male", phone: "" });
  };

  const handleCreateSafariGroup = async () => {
    if (
      !convexUser._id ||
      !selectedDate ||
      !title ||
      !leadPhone ||
      !leadCountry
    ) {
      toast.error("Required fields missing", {
        description: "Please provide date, title, phone number, and country.",
      });
      return;
    }

    const cleanLeadPhone = leadPhone.replace(/[\s+]/g, "");
    if (!/^\+\d{7,15}$/.test(cleanLeadPhone)) {
      toast.error(
        "Invalid lead phone number. Please enter a valid phone number with country code."
      );
      return;
    }

    const maxCapacity = hasGuide ? 7 : 6;
    const currentSize = members.length + 1;

    if (currentSize > maxCapacity) {
      toast.error(
        `Group size (${currentSize}) exceeds maximum capacity of ${maxCapacity}.`
      );
      return;
    }

    try {
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

      const paymentId = await createPayment({
        userId: convexUser._id,
        amount: basePrice,
        currency: "USD",
        method: "Stripe (example)",
        status: "completed",
        transactionId: nanoid(),
        timestamp: new Date().toISOString(),
      });

      const bookingId = await createBooking({
        safariId,
        userId: convexUser._id,
        bookingType: "group",
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });

      const groupId = await createGroup({
        safariId,
        leadId: convexUser._id,
        hasGuide,
        maxSize: maxCapacity,
        joinFee: basePrice,
      });

      await updateGroupWithMembersAndPassengers({
        groupId,
        bookingId,
        leadUserId: convexUser._id,
        leadPhone,
        members,
        maxCapacity,
      });

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
      setLeadCountry("");

      toast.success("Safari group created!", {
        description: `Your safari "${title}" is scheduled for ${format(selectedDate, "PPP")}. Group ID: ${groupId}`,
      });
      router.push("/dashboard");
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
              <Label htmlFor="leadCountry">Your Country</Label>
              <Select value={leadCountry} onValueChange={setLeadCountry}>
                <SelectTrigger id="leadCountry">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {getData().map((country: { code: string; name: string }) => (
                    <SelectItem key={country.code} value={country.name}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ReactCountryFlag
                          countryCode={country.code}
                          svg
                          style={{
                            width: "1.5em",
                            height: "1.5em",
                            marginRight: 6,
                          }}
                        />
                        {country.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadPhone">Your Mobile Phone Number</Label>
              <PhoneInput
                country={"us"}
                value={leadPhone}
                onChange={(phone) => setLeadPhone(phone)}
                inputProps={{
                  id: "leadPhone",
                  className:
                    "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                }}
                containerClass="w-full"
                buttonClass="rounded-l-md border border-input bg-background hover:bg-accent"
                dropdownClass="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
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

        <Card>
          <CardHeader>
            <CardTitle>Add Group Members</CardTitle>
            <CardDescription>
              Add additional individuals who will be joining your safari group.
              (Max {hasGuide ? 6 : 5} non-user members allowed, plus yourself)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

              <div className="space-y-2">
                <Label htmlFor="newMemberCountry">Country</Label>
                <Select
                  value={newMember.country}
                  onValueChange={(value) =>
                    setNewMember({ ...newMember, country: value })
                  }
                >
                  <SelectTrigger id="newMemberCountry">
                    <SelectValue placeholder="Country of residence" />
                  </SelectTrigger>
                  <SelectContent>
                    {getData().map(
                      (country: { code: string; name: string }) => (
                        <SelectItem key={country.code} value={country.name}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <ReactCountryFlag
                              countryCode={country.code}
                              svg
                              style={{
                                width: "1.5em",
                                height: "1.5em",
                                marginRight: 6,
                              }}
                            />
                            {country.name}
                          </span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="newMemberPhone">Member Phone Number</Label>
                <PhoneInput
                  country={"us"}
                  value={newMember.phone}
                  onChange={(phone) => setNewMember({ ...newMember, phone })}
                  inputProps={{
                    id: "newMemberPhone",
                    className:
                      "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  }}
                  containerClass="w-full"
                  buttonClass="rounded-l-md border border-input bg-background hover:bg-accent"
                  dropdownClass="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
                />
              </div>
            </div>

            <Button onClick={handleAddMember} className="w-full">
              Add Member to Group
            </Button>

            {members.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-lg font-semibold">
                  Current Group Members (Excluding Yourself):
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {members.map((member, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {member.name} ({member.gender}, {member.age} yrs, from{" "}
                      {getData().find((c) => c.name === member.country)?.name ||
                        member.country}
                      , Phone: {member.phone})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

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
