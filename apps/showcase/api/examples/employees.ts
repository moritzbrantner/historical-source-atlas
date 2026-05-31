import { employees } from '@/apps/showcase/data/employees';

export async function GET() {
  return Response.json(employees);
}
