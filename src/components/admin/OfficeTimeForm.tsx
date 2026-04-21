'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ClockIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function OfficeTimeForm({
  initialStartTime,
  initialEndTime,
  initialGraceTime = 60,
  onSaveSuccess
}: {
  initialStartTime: string;
  initialEndTime: string;
  initialGraceTime?: number;
  onSaveSuccess?: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      startTime: formatTime(initialStartTime),
      endTime: formatTime(initialEndTime),
      graceTime: initialGraceTime
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function formatTime(time: string) {
    return time;
  }

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/office-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success('Office times updated successfully');
        // Call the callback to refresh parent component data
        onSaveSuccess?.();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update office times');
      }
    } catch (error) {
      toast.error('Network error - please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <ClockIcon className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Configure Hours</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Office Start Time
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="time"
                {...register('startTime', {
                  required: 'Start time is required',
                  validate: (value) => {
                    const [hours, minutes] = value.split(':').map(Number);
                    return hours < 24 && minutes < 60 || 'Invalid time format';
                  }
                })}
                className={`block w-full rounded-md border ${errors.startTime ? 'border-red-300' : 'border-gray-300'} p-2 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Office End Time
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="time"
                {...register('endTime', {
                  required: 'End time is required',
                  validate: (value, { startTime }) => {
                    const [startH, startM] = startTime.split(':').map(Number);
                    const [endH, endM] = value.split(':').map(Number);
                    return endH > startH || (endH === startH && endM > startM) || 'End time must be after start time';
                  }
                })}
                className={`block w-full rounded-md border ${errors.endTime ? 'border-red-300' : 'border-gray-300'} p-2 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grace Period
            </label>
            <div className="relative rounded-md shadow-sm">
              <select
                {...register('graceTime', {
                  required: 'Grace time is required',
                  min: { value: 0, message: 'Grace time must be 0 or more minutes' },
                  max: { value: 480, message: 'Grace time cannot exceed 8 hours' }
                })}
                className={`block w-full rounded-md border ${errors.graceTime ? 'border-red-300' : 'border-gray-300'} p-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value={0}>No grace period</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
            {errors.graceTime && (
              <p className="mt-1 text-sm text-red-600">{errors.graceTime.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <CheckIcon className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
