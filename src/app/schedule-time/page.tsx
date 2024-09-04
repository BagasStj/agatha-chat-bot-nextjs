'use client'

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from 'antd';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Toast } from "@/components/ui/toast"; // Import toast dari shadcn
import './DatePickerStyles.css'; // Impor file CSS kustom
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import moment from 'moment'; // Import moment

const { RangePicker } = DatePicker;
const token = process.env.FONNTE_TOKEN;

const ScheduleWhatsApp: React.FC = () => {
    const { toast } = useToast();
    const form = useForm();

    const onSubmit = async (data: any) => {
        try {
            console.log(data);
            const response = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    'Authorization': 'hz#DqQvWwFUn9g1LE@mA', // Ganti dengan token yang valid
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target: data.target,
                    message: data.message,
                    schedule: Math.floor(new Date(data.schedule).getTime() / 1000), // Convert to Unix timestamp
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            console.log('[result]', result);
            if(result.status == false){
                toast({
                    title: 'Failed to schedule message. Please try again.',
                    description: result.reason,
                    variant: 'destructive',
                })
            }else{
                
                toast({
                    title: 'Message scheduled successfully!',
                    className: "bg-green-100 border-green-400 text-green-700"
                })
            }
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: 'Failed to schedule message. Please try again.',
                description: 'An error occurred while scheduling your message.',
                variant: 'destructive',
            })
        }
    };

    return (
        <div className="container mx-auto p-4">
              <Toaster />
            <h1 className="text-2xl font-bold mb-4">Schedule WhatsApp Message</h1>
            <Tabs defaultValue="form">
                <TabsList>
                    <TabsTrigger value="form">Form</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="form">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="target"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Number</FormLabel>
                                        <FormControl>
                                            <div className="flex">
                                                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                                                    +62
                                                </span>
                                                <Input {...field} className="rounded-l-none" placeholder="8123456789" />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Type your message here" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="schedule"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Schedule</FormLabel>
                                        <FormControl>
                                            <div>
                                                <DatePicker
                                                    className="custom-date-picker"
                                                    size="small"
                                                    showTime
                                                    format="YYYY-MM-DD HH:mm"
                                                    defaultValue={moment()} // Set default value to current time
                                                    onChange={(date, dateString) => field.onChange(dateString)}
                                                />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <Button type="submit">Schedule Message</Button>
                        </form>
                    </Form>
                </TabsContent>
                <TabsContent value="history">
                    {/* Implementasi tabel atau daftar riwayat pesan terjadwal */}
                    <p>History of scheduled messages will be displayed here.</p>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ScheduleWhatsApp;