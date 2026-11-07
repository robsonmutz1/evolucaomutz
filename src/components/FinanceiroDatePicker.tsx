import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
export function FinanceiroDatePicker({value,onChange,label}:{value:string;onChange:(s:string)=>void;label:string}){
 const [open,setOpen]=useState(false);const d=value?new Date(`${value}T12:00:00`):undefined;
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full min-w-0 justify-start text-left font-normal" aria-label={label}><CalendarIcon className="h-4 w-4 shrink-0"/>{value?value.split('-').reverse().join('/'):'Selecionar data'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={d} defaultMonth={d} onSelect={date=>{if(date){onChange(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);setOpen(false);}}} className="pointer-events-auto p-3" captionLayout="dropdown" startMonth={new Date(1900,0)} endMonth={new Date(2200,11)}/></PopoverContent></Popover>;
}