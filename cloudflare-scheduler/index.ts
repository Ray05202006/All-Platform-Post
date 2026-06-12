export interface Env {
  SCHEDULER_APP_URL: string;
  SCHEDULER_API_KEY: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron trigger: processing due scheduled posts at ${new Date(event.scheduledTime).toISOString()}`);
    
    if (!env.SCHEDULER_APP_URL) {
      console.error('Error: SCHEDULER_APP_URL is not configured in Worker variables.');
      return;
    }
    if (!env.SCHEDULER_API_KEY) {
      console.error('Error: SCHEDULER_API_KEY is not configured in Worker variables.');
      return;
    }

    try {
      const url = `${env.SCHEDULER_APP_URL.replace(/\/$/, '')}/api/scheduler/process`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scheduler-api-key': env.SCHEDULER_API_KEY,
        },
      });
      console.log(`Cron trigger response status: ${res.status}`);
    } catch (error) {
      console.error('Cron trigger HTTP request failed:', error);
    }
  },
};
