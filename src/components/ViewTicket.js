import { Card, CardContent, CardHeader, CardTitle } from "./Card"
import Badge from "./Badge"
import Button from "./Button"
import useFetch from "../useFetch"
import { useState } from 'react';

const ViewTicket = ({ ticketId, setCurrentPage }) => {
  const { data: ticket, isPending, error } = useFetch(`http://localhost:8000/tickets/${ticketId}`);

  const getStatusVariant = status => {
    switch (status) {
      case "Closed":
        return "default"
      case "In Progress":
        return "secondary"
      case "Open":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPriorityVariant = priority => {
    switch (priority) {
      case "Critical":
        return "destructive"
      case "High":
        return "destructive"
      case "Medium":
        return "secondary"
      case "Low":
        return "outline"
      default:
        return "outline"
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading ticket details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-red-500">Error loading ticket: {error}</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Ticket not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setCurrentPage("tickets")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Tickets
            </button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Ticket Details
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-mono text-sm">
            {ticket.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(`edit-ticket-${ticket.id}`)}
          >
            ✏️ Edit Ticket
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage("tickets")}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant={getStatusVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
                <Badge variant={getPriorityVariant(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
            </CardHeader>
            {ticket.description && (
              <CardContent>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags2</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Work Group
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.workGroup}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Responsible Person
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.responsible}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Module
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.module}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.initiateDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created
                  </label>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {new Date(ticket.initiateDate).toLocaleString()}
                  </div>
                </div>
              )}
              {ticket.startDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Start Date
                  </label>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {ticket.startDate}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Due Date
                </label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {ticket.dueDate}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Current Status
                </label>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(ticket.status)} className="text-sm">
                    {ticket.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Priority Level
                </label>
                <div className="mt-1">
                  <Badge variant={getPriorityVariant(ticket.priority)} className="text-sm">
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
  );
};

export default ViewTicket;