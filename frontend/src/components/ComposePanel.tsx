import React, { useState, useRef } from 'react';
import { useForm as useHookForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { addDays, setHours, setMinutes, format } from 'date-fns';
import { Paperclip, Clock, Upload, Bold, Italic, Underline } from 'lucide-react';

import { api } from '../lib/api';
import { SlideOver } from './ui/SlideOver';
import { Popover } from './ui/Popover';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Chip } from './ui/Chip';
import { Spinner } from './ui/Spinner';
import { showToast } from './ui/Toast';

const composeSchema = z.object({
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  delaySeconds: z.number().min(0, 'Delay must be 0 or more'),
  hourlyLimit: z.number().min(1, 'Must be at least 1'),
  startTime: z.date().optional(),
  senderId: z.string().optional(),
});

type ComposeFormValues = z.infer<typeof composeSchema>;

interface ComposePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComposePanel: React.FC<ComposePanelProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFileCount, setCsvFileCount] = useState<number | null>(null);

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useHookForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      recipients: [],
      subject: '',
      body: '',
      delaySeconds: 2,
      hourlyLimit: 100,
      startTime: undefined,
      senderId: undefined,
    }
  });

  const recipients = watch('recipients');
  const startTime = watch('startTime');
  const [recipientInput, setRecipientInput] = useState('');

  // Gap 3: Fetch available senders for the dropdown
  const { data: sendersData } = useQuery({
    queryKey: ['senders'],
    queryFn: async () => {
      const res = await api.get('/senders');
      return res.data;
    },
    enabled: isOpen,
  });

  const createCampaign = useMutation({
    mutationFn: async (data: ComposeFormValues) => {
      // Gap 2: Convert seconds → milliseconds before POSTing
      const payload = {
        subject: data.subject,
        body: data.body,
        recipients: data.recipients,
        startTime: (startTime || data.startTime)?.toISOString() || new Date().toISOString(),
        delayBetweenMs: data.delaySeconds * 1000,
        hourlyLimit: data.hourlyLimit,
        senderId: data.senderId || undefined,
      };
      console.log('Sending Payload:', payload);
      const res = await api.post('/campaigns', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      // Gap 8: Success toast
      showToast(`Campaign scheduled — ${data.scheduledCount} emails queued!`, 'success');
      reset();
      setCsvFileCount(null);
      onClose();
    },
    onError: (err: any) => {
      // Gap 9: Error toast
      const msg = err?.response?.data?.error || 'Failed to schedule campaign. Please try again.';
      showToast(msg, 'error');
    },
  });

  const onSubmit = (data: ComposeFormValues) => {
    createCampaign.mutate(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const emails = results.data
          .flat()
          .map((v) => String(v).trim())
          .filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

        const uniqueEmails = Array.from(new Set([...recipients, ...emails]));
        setValue('recipients', uniqueEmails, { shouldValidate: true });
        // Gap 10: Show how many emails were detected from the file
        setCsvFileCount(emails.length);
        showToast(`${emails.length} email addresses detected from CSV`, 'success');
      },
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = recipientInput.trim().replace(/,$/, '');
      if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !recipients.includes(val)) {
        setValue('recipients', [...recipients, val], { shouldValidate: true });
        setRecipientInput('');
      }
    }
  };

  const removeRecipient = (email: string) => {
    setValue('recipients', recipients.filter((r) => r !== email), { shouldValidate: true });
  };

  const setPresetTime = (label: string) => {
    const now = new Date();
    let time: Date = now;
    if (label === 'Tomorrow 10 AM') {
      time = setHours(setMinutes(addDays(now, 1), 0), 10);
    } else if (label === 'Tomorrow 11 AM') {
      time = setHours(setMinutes(addDays(now, 1), 0), 11);
    } else if (label === 'Tomorrow 3 PM') {
      time = setHours(setMinutes(addDays(now, 1), 0), 15);
    }
    setValue('startTime', time);
  };

  const popoverContent = (close: () => void) => (
    <div className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Send Later</h3>
      <input
        type="datetime-local"
        className="mb-3 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        value={startTime ? format(startTime, "yyyy-MM-dd'T'HH:mm") : ''}
        onChange={(e) => {
          if (e.target.value) {
            setValue('startTime', new Date(e.target.value));
          } else {
            setValue('startTime', undefined);
          }
        }}
      />
      <div className="flex flex-col gap-1 mb-3">
        <button type="button" onClick={() => setPresetTime('Tomorrow 10 AM')} className="text-left text-sm text-gray-600 hover:bg-gray-50 px-2 py-1.5 rounded">Tomorrow, 10:00 AM</button>
        <button type="button" onClick={() => setPresetTime('Tomorrow 11 AM')} className="text-left text-sm text-gray-600 hover:bg-gray-50 px-2 py-1.5 rounded">Tomorrow, 11:00 AM</button>
        <button type="button" onClick={() => setPresetTime('Tomorrow 3 PM')} className="text-left text-sm text-gray-600 hover:bg-gray-50 px-2 py-1.5 rounded">Tomorrow, 3:00 PM</button>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
        <Button variant="ghost" size="sm" onClick={() => { setValue('startTime', undefined); close(); }}>Clear</Button>
        <Button size="sm" onClick={close}>Done</Button>
      </div>
    </div>
  );

  const senders = sendersData?.senders || [];

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Compose New Email"
      headerActions={
        <>
          <button type="button" className="p-2 text-gray-400 hover:text-gray-600">
            <Paperclip className="h-5 w-5" />
          </button>
          <Popover
            trigger={<button type="button" className="p-2 text-gray-400 hover:text-gray-600"><Clock className="h-5 w-5" /></button>}
            content={popoverContent}
          />
          <Button onClick={handleSubmit(onSubmit)} disabled={createCampaign.isPending}>
            {createCampaign.isPending ? <Spinner size="sm" className="mr-2" /> : null}
            {startTime ? 'Send Later' : 'Send'}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
        
        {/* Gap 3: Sender dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">From</label>
          <select
            {...register('senderId')}
            className="h-10 rounded-lg bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#4CAF50]"
          >
            <option value="">Default Sender</option>
            {senders.map((s: { id: string; email: string }) => (
              <option key={s.id} value={s.id}>{s.email}</option>
            ))}
          </select>
        </div>

        {/* Recipients with CSV upload */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">To</label>
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <div className="flex-1 rounded-lg bg-gray-50 p-2 min-h-[40px] flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#4CAF50]">
              {recipients.slice(0, 3).map((r) => (
                <Chip key={r} label={r} onRemove={() => removeRecipient(r)} />
              ))}
              {recipients.length > 3 && (
                <Chip label={`+${recipients.length - 3}`} />
              )}
              <input
                type="text"
                placeholder={recipients.length === 0 ? "recipient@example.com" : ""}
                className="flex-1 bg-transparent text-sm outline-none min-w-[150px]"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
              />
            </div>
            <div className="shrink-0 pt-1">
              <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 text-sm text-[#4CAF50] hover:text-[#45a049] font-medium px-2 py-1"
              >
                <Upload className="h-4 w-4" />
                Upload List
              </button>
            </div>
          </div>
          {/* Gap 10: Prominent count */}
          {recipients.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-[#4CAF50]">{recipients.length}</span> email{recipients.length !== 1 ? 's' : ''} added
              {csvFileCount !== null && <span> ({csvFileCount} from CSV)</span>}
            </p>
          )}
          {errors.recipients && <p className="text-xs text-red-500">{errors.recipients.message}</p>}
        </div>

        <Input
          label="Subject"
          placeholder="Subject"
          {...register('subject')}
          error={errors.subject?.message}
        />

        {/* Gap 2: Label clearly says seconds */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Delay between emails (seconds)"
            {...register('delaySeconds', { valueAsNumber: true })}
            error={errors.delaySeconds?.message}
          />
          <Input
            type="number"
            label="Hourly Limit"
            {...register('hourlyLimit', { valueAsNumber: true })}
            error={errors.hourlyLimit?.message}
          />
        </div>

        {/* Body editor */}
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Body</label>
          <div className="flex items-center gap-1 border-b border-gray-100 pb-2">
            <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"><Bold className="h-4 w-4" /></button>
            <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"><Italic className="h-4 w-4" /></button>
            <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"><Underline className="h-4 w-4" /></button>
          </div>
          <Controller
            name="body"
            control={control}
            render={({ field }: any) => (
              <textarea
                {...field}
                className="w-full h-48 resize-none bg-gray-50 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#4CAF50] mt-2"
                placeholder="Type Your Reply..."
              />
            )}
          />
          {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
        </div>
      </form>
    </SlideOver>
  );
};
