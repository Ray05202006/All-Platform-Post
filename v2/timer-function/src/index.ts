import { app, InvocationContext, Timer } from '@azure/functions';

const SCHEDULER_APP_URL = process.env.SCHEDULER_APP_URL || '';
const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY || '';

app.timer('scheduled-posts-processor', {
  schedule: '0 * * * * *',
  handler: async (_timer: Timer, context: InvocationContext) => {
    context.log('Timer trigger: processing due scheduled posts');

    try {
      const res = await fetch(`${SCHEDULER_APP_URL}/api/scheduler/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scheduler-key': SCHEDULER_API_KEY,
        },
      });

      context.log(`Timer trigger: response ${res.status}`);
    } catch (error) {
      context.error('Timer trigger error:', error);
      throw error;
    }
  },
});
