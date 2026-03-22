import { SchedulerService } from './scheduler.service';

function makeService() {
  const prisma = {
    post: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  } as any;

  const service = new SchedulerService(prisma);
  return { service, prisma };
}

describe('SchedulerService', () => {
  describe('schedulePost - time boundary validation', () => {
    it('should accept a date 1 hour in the future', async () => {
      const { service, prisma } = makeService();
      const future = new Date(Date.now() + 60 * 60 * 1000);

      await expect(service.schedulePost('post1', 'user1', future)).resolves.not.toThrow();
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'scheduled', scheduledAt: future }),
        }),
      );
    });

    it('should accept a date just over 5 minutes in the past (within tolerance)', async () => {
      const { service } = makeService();
      // 4 minutes in the past — within the 5-minute tolerance window
      const slightlyPast = new Date(Date.now() - 4 * 60 * 1000);

      await expect(service.schedulePost('post1', 'user1', slightlyPast)).resolves.not.toThrow();
    });

    it('should reject a date more than 5 minutes in the past', async () => {
      const { service } = makeService();
      const tooFarPast = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      await expect(service.schedulePost('post1', 'user1', tooFarPast)).rejects.toThrow(
        'Scheduled time is too far in the past',
      );
    });

    it('should reject a date 1 year and 1 day in the future', async () => {
      const { service } = makeService();
      const tooFarFuture = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);

      await expect(service.schedulePost('post1', 'user1', tooFarFuture)).rejects.toThrow(
        'Scheduled time is too far in the future',
      );
    });

    it('should accept a date exactly 365 days in the future', async () => {
      const { service } = makeService();
      // Slightly under 365 days to stay within the limit
      const almostMaxFuture = new Date(Date.now() + 364 * 24 * 60 * 60 * 1000);

      await expect(service.schedulePost('post1', 'user1', almostMaxFuture)).resolves.not.toThrow();
    });

    it('should reject an invalid date (NaN)', async () => {
      const { service } = makeService();
      const invalidDate = new Date('not-a-date');

      await expect(service.schedulePost('post1', 'user1', invalidDate)).rejects.toThrow(
        'Invalid scheduled time',
      );
    });
  });

  describe('cancelSchedule', () => {
    it('should update post status to draft and clear scheduledAt', async () => {
      const { service, prisma } = makeService();

      const result = await service.cancelSchedule('post1');

      expect(result).toBe(true);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post1' },
          data: { status: 'draft', scheduledAt: null },
        }),
      );
    });

    it('should return false when prisma update throws', async () => {
      const { service, prisma } = makeService();
      prisma.post.update.mockRejectedValue(new Error('DB error'));

      const result = await service.cancelSchedule('post1');

      expect(result).toBe(false);
    });
  });

  describe('getJobStatus', () => {
    it('should return exists=false when post is not found', async () => {
      const { service, prisma } = makeService();
      prisma.post.findUnique.mockResolvedValue(null);

      const status = await service.getJobStatus('post1');

      expect(status).toEqual({ exists: false });
    });

    it('should return exists=false when post is not in scheduled status', async () => {
      const { service, prisma } = makeService();
      prisma.post.findUnique.mockResolvedValue({ status: 'published', scheduledAt: null });

      const status = await service.getJobStatus('post1');

      expect(status).toEqual({ exists: false });
    });

    it('should return job info when post is scheduled', async () => {
      const { service, prisma } = makeService();
      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
      prisma.post.findUnique.mockResolvedValue({ status: 'scheduled', scheduledAt });

      const status = await service.getJobStatus('post1');

      expect(status).toEqual({ exists: true, status: 'scheduled', scheduledFor: scheduledAt });
    });
  });
});
