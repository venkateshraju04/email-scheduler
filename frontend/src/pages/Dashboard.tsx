import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { Inbox } from 'lucide-react';

interface EmailJob {
  email: string;
  subject: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
}

export const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'scheduled';

  const { data, isLoading, error } = useQuery({
    queryKey: ['emails', tab],
    queryFn: async () => {
      const res = await api.get(`/emails?status=${tab}`);
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5s for job updates
  });

  const getStatusBadge = (job: EmailJob) => {
    if (tab === 'scheduled') {
      return (
        <Badge variant="gray" className="gap-1 rounded-md px-2 py-1 text-[11px]">
          {job.scheduledAt ? format(new Date(job.scheduledAt), 'MMM d, h:mm a') : 'Unknown'}
        </Badge>
      );
    }
    
    switch (job.status) {
      case 'sent':
        return <Badge variant="success">Sent</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="gray">{job.status}</Badge>;
    }
  };

  // Function no longer needed since body isn't returned, but keeping it empty just in case
  const getPlainText = (html: string) => '';

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Top Search Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-6">
        <div className="flex flex-1 items-center gap-2">
          {/* visual only */}
          <div className="relative w-96 max-w-full">
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-full rounded-md bg-gray-100 px-4 text-sm outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#4CAF50]/20 border border-transparent focus:border-[#4CAF50]/30 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Main List Area */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-500">
            Failed to load emails
          </div>
        ) : data?.emails?.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-500 gap-3">
            <div className="rounded-full bg-gray-50 p-4">
              <Inbox className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium">No {tab} emails yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {data?.emails?.map((job: EmailJob, index: number) => (
              <div 
                key={index} 
                className="group flex cursor-pointer items-center border-b border-gray-100 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-[200px] shrink-0 pr-4 text-sm font-medium text-gray-900 truncate">
                  To: {job.email}
                </div>
                
                <div className="flex flex-1 items-center gap-4 min-w-0 pr-4">
                  <div className="shrink-0">{getStatusBadge(job)}</div>
                  <div className="flex-1 truncate text-sm">
                    <span className="font-semibold text-gray-900 mr-2">{job.subject}</span>
                  </div>
                </div>
                
                {/* Decorative Star */}
                <div className="shrink-0">
                  <button className="text-gray-300 hover:text-yellow-400 focus:outline-none">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
