const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

class ImportJobManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    this.JOB_STATUS = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    };
  }

  createJob(jobId, type, totalItems) {
    const job = {
      jobId,
      type,
      status: this.JOB_STATUS.PENDING,
      totalItems,
      processedItems: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      updatedCount: 0,
      startTime: null,
      endTime: null,
      error: null,
      canCancel: true,
      result: null,
      createdAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates);
    this.emit('jobUpdate', job);
    return job;
  }

  startJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = this.JOB_STATUS.PROCESSING;
    job.startTime = new Date();
    this.emit('jobStart', job);
    return job;
  }

  incrementProgress(jobId, success = 0, failed = 0, skipped = 0, updated = 0) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.processedItems += success + failed + skipped + updated;
    job.successCount += success;
    job.failedCount += failed;
    job.skippedCount += skipped;
    job.updatedCount += updated;
    this.emit('jobProgress', job);
    return job;
  }

  completeJob(jobId, result = null) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = this.JOB_STATUS.COMPLETED;
    job.endTime = new Date();
    job.canCancel = false;
    job.result = result;
    this.emit('jobComplete', job);
    return job;
  }

  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = this.JOB_STATUS.FAILED;
    job.endTime = new Date();
    job.canCancel = false;
    job.error = error;
    this.emit('jobFailed', job);
    return job;
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || !job.canCancel) return null;

    job.status = this.JOB_STATUS.CANCELLED;
    job.endTime = new Date();
    job.canCancel = false;
    this.emit('jobCancelled', job);
    return job;
  }

  getJobProgress(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const progress = {
      jobId: job.jobId,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      progressPercent:
        job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
      successCount: job.successCount,
      failedCount: job.failedCount,
      skippedCount: job.skippedCount,
      updatedCount: job.updatedCount,
      canCancel: job.canCancel,
      error: job.error,
      startTime: job.startTime,
      endTime: job.endTime,
      elapsedTime: job.startTime
        ? Date.now() - new Date(job.startTime).getTime()
        : null,
    };

    return progress;
  }

  listJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      progressPercent:
        job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
      canCancel: job.canCancel,
      startTime: job.startTime,
      endTime: job.endTime,
      createdAt: job.createdAt,
    }));
  }

  cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      const jobEndTime = job.endTime || job.createdAt;
      if (now - new Date(jobEndTime).getTime() > maxAgeMs) {
        this.jobs.delete(jobId);
      }
    }
  }
}

const importJobManager = new ImportJobManager();

setInterval(() => {
  importJobManager.cleanupOldJobs();
}, 60 * 60 * 1000);

module.exports = {
  importJobManager,
  ImportJobManager,
};