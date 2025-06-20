'use client';

import { redirect } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/index';

/**
 * Admin dashboard displaying users, safaris, bookings, groups, and payments.
 * @returns JSX element for the admin dashboard.
 */
export default function AdminDashboard() {
  const { user, isLoaded } = useUser();

  // Redirect if not loaded, no user, or not admin
  // if (!isLoaded || !user || user.publicMetadata.role !== 'admin') {
  //   redirect('/dashboard');
  // }

  // Fetch data with appropriate arguments
  const users = useQuery(api.queries.getUsers) || [];
  const safaris = useQuery(api.queries.getSafaris, { status: undefined }) || [];
  const bookings = useQuery(api.queries.getBookings) || [];
  const groups = useQuery(api.queries.getGroups) || [];
  const payments = useQuery(api.queries.getPayments) || [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 gap-6">
          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Safaris */}
          <Card>
            <CardHeader>
              <CardTitle>Safaris</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Max Capacity</TableHead>
                    <TableHead>Base Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safaris.map((safari) => (
                    <TableRow key={safari._id}>
                      <TableCell>{safari.title}</TableCell>
                      <TableCell>{safari.date}</TableCell>
                      <TableCell>{safari.status}</TableCell>
                      <TableCell>{safari.maxCapacity}</TableCell>
                      <TableCell>${safari.basePrice}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Safari ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking._id}>
                      <TableCell>{booking.safariId}</TableCell>
                      <TableCell>{booking.userId || 'N/A'}</TableCell>
                      <TableCell>{booking.bookingType}</TableCell>
                      <TableCell>{booking.status}</TableCell>
                      <TableCell>{booking.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Safari ID</TableHead>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Guide</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group._id}>
                      <TableCell>{group.safariId}</TableCell>
                      <TableCell>{group.leadId}</TableCell>
                      <TableCell>{group.currentSize}/{group.maxSize}</TableCell>
                      <TableCell>{group.status}</TableCell>
                      <TableCell>{group.hasGuide ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>{payment.userId || 'N/A'}</TableCell>
                      <TableCell>${payment.amount}</TableCell>
                      <TableCell>{payment.status}</TableCell>
                      <TableCell>{payment.transactionId}</TableCell>
                      <TableCell>{payment.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}