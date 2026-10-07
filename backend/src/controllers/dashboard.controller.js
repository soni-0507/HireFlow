import Candidate from '../models/Candidate.js';
import Interview from '../models/Interview.js';
import Feedback from '../models/Feedback.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assignedCandidateIds } from '../services/access.js';
import { ROLES, STAGES } from '../constants.js';

export const summary = asyncHandler(async (req, res) => {
  const isRecruiter = req.user.role === ROLES.RECRUITER;
  const now = new Date();

  const candidateFilter = isRecruiter ? {} : { _id: { $in: await assignedCandidateIds(req.user) } };
  const interviewFilter = isRecruiter ? {} : { interviewer: req.user._id };

  const [stageAgg, upcoming] = await Promise.all([
    Candidate.aggregate([{ $match: candidateFilter }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
    Interview.find({ ...interviewFilter, status: 'scheduled', scheduledAt: { $gte: now } })
      .populate('candidate', 'name position stage')
      .populate('interviewer', 'name')
      .sort('scheduledAt')
      .limit(6),
  ]);

  const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  stageAgg.forEach((s) => (counts[s._id] = s.count));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const inProgress = total - counts.Rejected - counts.Hired;

  const data = {
    role: req.user.role,
    totals: { candidates: total, inProgress, hired: counts.Hired, rejected: counts.Rejected },
    stageCounts: STAGES.map((stage) => ({ stage, count: counts[stage] })),
    upcomingInterviews: upcoming,
  };

  if (isRecruiter) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const count = (action) => ({ $sum: { $cond: [{ $eq: ['$action', action] }, 1, 0] } });
    const [activitySummary, recentActivity] = await Promise.all([
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$actor',
            total: { $sum: 1 },
            candidatesAdded: count('candidate.created'),
            stageChanges: count('candidate.stage_changed'),
            interviewsScheduled: count('interview.scheduled'),
            notesAdded: count('note.added'),
            feedbackSubmitted: count('feedback.submitted'),
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $match: { 'user.role': ROLES.RECRUITER } },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$user.name',
            total: 1,
            candidatesAdded: 1,
            stageChanges: 1,
            interviewsScheduled: 1,
            notesAdded: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
      ActivityLog.find().populate('actor', 'name role').sort('-createdAt').limit(8),
    ]);
    data.activitySummary = activitySummary;
    data.recentActivity = recentActivity;
  } else {
    const [pending, submitted] = await Promise.all([
      Interview.find({ interviewer: req.user._id, status: { $ne: 'cancelled' }, scheduledAt: { $lt: now } }).select('_id'),
      Feedback.countDocuments({ interviewer: req.user._id }),
    ]);
    const withFeedback = new Set(
      (await Feedback.find({ interviewer: req.user._id }).select('interview')).map((f) => String(f.interview))
    );
    data.interviewerStats = {
      pendingFeedback: pending.filter((i) => !withFeedback.has(String(i._id))).length,
      feedbackSubmitted: submitted,
    };
  }

  res.json({ data });
});
