'use client';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';

export default function OfficeTimeSettings() {
  const { register, handleSubmit, setValue } = useForm();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/office-times')
      .then(res => res.json())
      .then(data => {
        if (data.startTime) setValue('startTime', formatTime(data.startTime));
        if (data.endTime) setValue('endTime', formatTime(data.endTime));
      });
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: any) => {
    const response = await fetch('/api/admin/office-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">Office Time Settings</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input 
            type="time" 
            {...register('startTime', { required: true })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <input 
            type="time" 
            {...register('endTime', { required: true })}
            className="w-full p-2 border rounded"
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Save Settings
        </button>
        {success && (
          <div className="p-2 bg-green-100 text-green-800 rounded text-sm">
            Settings saved successfully!
          </div>
        )}
      </form>
    </div>
  );
}
