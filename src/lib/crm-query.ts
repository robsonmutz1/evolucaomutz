import { queryOptions } from '@tanstack/react-query';
import { listarCRM } from './crm.functions';
export const crmQuery = queryOptions({queryKey:['school','crm'],queryFn:()=>listarCRM(),staleTime:30000});