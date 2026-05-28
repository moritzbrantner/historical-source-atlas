import { createProblemReport } from '@/src/domain/support/problem-reports';
import { createApiRoute } from '@/src/http/route';

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export const POST = createApiRoute({
  action: 'support.reportProblem',
  featureKey: 'reportProblem',
  async handler({ request }) {
    const formData = await request.formData();
    const result = await createProblemReport({
      name: readString(formData, 'name'),
      email: readString(formData, 'email'),
      area: readString(formData, 'area'),
      pageUrl: readString(formData, 'pageUrl'),
      subject: readString(formData, 'subject'),
      details: readString(formData, 'details'),
    });

    if (!result.ok) {
      return Response.json(
        {
          error: result.error,
        },
        { status: 400 },
      );
    }

    return Response.json(
      { referenceId: result.value.referenceId },
      {
        status: 201,
      },
    );
  },
});
