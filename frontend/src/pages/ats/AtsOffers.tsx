import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';

export const AtsOffers = () => {
  // Mock data for offers
  const offers = [
    {
      id: '1',
      candidate: 'John Smith',
      position: 'Senior Software Engineer',
      salary: '$120,000',
      status: 'pending',
      sentDate: '2024-01-15',
      expiryDate: '2024-01-29',
    },
    {
      id: '2',
      candidate: 'Sarah Johnson',
      position: 'Product Manager',
      salary: '$95,000',
      status: 'accepted',
      sentDate: '2024-01-10',
      acceptedDate: '2024-01-12',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="py-8 px-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Offers</h1>
          <p className="text-muted-foreground">Manage job offers and negotiations</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Create Offer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">83%</div>
            <p className="text-xs text-muted-foreground">10 out of 12 accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Accept</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2</div>
            <p className="text-xs text-muted-foreground">Days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Offers</CardTitle>
          <CardDescription>Latest job offers and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{offer.candidate}</h3>
                      <Badge className={getStatusColor(offer.status)}>{offer.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{offer.position}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <DollarSign className="mr-1 h-4 w-4" />
                        {offer.salary}
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        Sent: {new Date(offer.sentDate).toLocaleDateString()}
                      </div>
                      {offer.status === 'pending' && (
                        <div className="flex items-center text-orange-600">
                          <Clock className="mr-1 h-4 w-4" />
                          Expires: {new Date(offer.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                      {offer.status === 'accepted' && offer.acceptedDate && (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Accepted: {new Date(offer.acceptedDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      View Offer
                    </Button>
                    {offer.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm">
                          Remind
                        </Button>
                        <Button variant="outline" size="sm">
                          Extend
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
