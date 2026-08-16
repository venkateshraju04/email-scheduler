import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { Inbox, ArrowLeft } from 'lucide-react';

interface EmailJob {
  id: string;
  email: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
}

export const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'scheduled';
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['emails', tab],
    queryFn: async () => {
      const res = await api.get(`/emails?status=${tab}`);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const getStatusBadge = (job: EmailJob) => {
    switch (job.status) {
      case 'queued':
        return <Badge variant="gray">Queued</Badge>;
      case 'delayed_retry':
        return <Badge variant="warning">Rate Limited</Badge>;
      case 'sent':
        return <Badge variant="success">Sent</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="gray">{job.status}</Badge>;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm:ss a');
    } catch {
      return '—';
    }
  };

  const isScheduled = tab === 'scheduled';

  // Detail view when an email is selected
  if (selectedEmail) {
    return (
      <div className="flex h-full w-full flex-col bg-white">
        {/* Detail header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 px-6">
          <button
            onClick={() => setSelectedEmail(null)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 truncate">{selectedEmail.subject}</h2>
          <div className="ml-auto">{getStatusBadge(selectedEmail)}</div>
        </header>

        {/* Detail body */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-col gap-2 text-sm border-b border-gray-100 pb-4">
              <div className="flex gap-2">
                <span className="font-medium text-gray-500 w-16">From:</span>
                <span className="text-gray-900">{selectedEmail.senderEmail}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-gray-500 w-16">To:</span>
                <span className="text-gray-900">{selectedEmail.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-gray-500 w-16">
                  {selectedEmail.sentAt ? 'Sent:' : 'Scheduled:'}
                </span>
                <span className="text-gray-900">
                  {selectedEmail.sentAt
                    ? formatTime(selectedEmail.sentAt)
                    : formatTime(selectedEmail.scheduledAt)}
                </span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-6">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-80 max-w-full">
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-full rounded-md bg-gray-100 px-4 text-sm outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#4CAF50]/20 border border-transparent focus:border-[#4CAF50]/30 transition-all"
            />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {data?.total !== undefined && `${data.total} total`}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-500 text-sm">
            Failed to load emails. Please try again.
          </div>
        ) : !data?.emails?.length ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 gap-3">
            <div className="rounded-full bg-gray-50 p-5">
              <Inbox className="h-10 w-10" />
            </div>
            <p className="text-sm font-medium">
              No {isScheduled ? 'scheduled' : 'sent'} emails yet
            </p>
            <p className="text-xs">
              {isScheduled ? 'Compose an email to get started.' : 'Scheduled emails will appear here once sent.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left font-medium text-gray-500 px-6 py-3">Email</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Subject</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">
                  {isScheduled ? 'Scheduled Time' : 'Sent Time'}
                </th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.emails.map((job: EmailJob) => (
                <tr
                  key={job.id}
                  onClick={() => setSelectedEmail(job)}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-3.5 font-medium text-gray-900 truncate max-w-[220px]">
                    {job.email}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 truncate max-w-[280px]">
                    {job.subject}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                    {isScheduled ? formatTime(job.scheduledAt) : formatTime(job.sentAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    {getStatusBadge(job)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
