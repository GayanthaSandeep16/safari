"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner"
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Doc, Id } from "../../../convex/_generated/dataModel";

export default function Safari() {
  const router = useRouter();
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(10);
  const [basePrice, setBasePrice] = useState(100);
  const [isShared, setIsShared] = useState(false);

  const safaris = useQuery(api.queries.getSafaris, { status: "active" }) || [];
  const createSafari = useMutation(api.mutations.createSafari);
  const createBooking = useMutation(api.mutations.createBooking);

  const handleSafariSubmit = async () => {
    if (!userId || !selectedDate || !title) {
      toast.error("Required fields missing", {
        description: "Please provide a date and title",
      });
      return;
    }

    const safariId = await createSafari({
      date: format(selectedDate, "yyyy-MM-dd"),
      title,
      description,
      maxCapacity,
      basePrice,
      userId: userId as Id<"users">,
      status: "active",
      isShared,
    });

    await createBooking({
      safariId,
      userId: userId as Id<"users">,
      bookingType: "individual",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    });

    setSelectedDate(undefined);
    setTitle("");
    setDescription("");
    setMaxCapacity(10);
    setBasePrice(100);
    setIsShared(false);

    toast.success("Safari created!", {
      description: `Your safari "${title}" is scheduled for ${format(
        selectedDate,
        "PPP"
      )}`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Safari Booking</h1>
            <p className="text-muted-foreground">Create a new safari adventure</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Safari Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create a Safari</CardTitle>
              <CardDescription>Choose details for your safari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Safari Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
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
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Safari name..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add details or special requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Max Capacity</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  <Input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                  />
                  Shareable Safari
                </Label>
              </div>

              <Button onClick={handleSafariSubmit} className="w-full">
                Create Safari
              </Button>
            </CardContent>
          </Card>

          {/* Safari List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Safaris</CardTitle>
              <CardDescription>Upcoming safari bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {safaris.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No safaris created yet. Create one to get started!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safaris.map((safari: Doc<"safaris">) => (
                      <TableRow key={safari._id}>
                        <TableCell className="font-medium">{safari.date}</TableCell>
                        <TableCell>{safari.title}</TableCell>
                        <TableCell>{safari.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}