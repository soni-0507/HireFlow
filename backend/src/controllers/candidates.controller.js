import Candidate from '../models/Candidate.js';
import Interview from '../models/Interview.js';
import Feedback from '../models/Feedback.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, pageMeta } from '../utils/helpers.js';
import { assertCandidateAccess, assignedCandidateIds } from '../services/access.js';
import { logActivity } from '../services/activity.js';
import { sendMail } from '../services/mailer.js';
import { ROLES } from '../constants.js';

const STAGE_EMAILS = {
  Screening: 'Your application has moved to the screening stage. Our team will be in touch shortly.',
  'Technical Interview': 'Congratulations! You have been shortlisted for a technical interview.',
  'HR Interview': 'Great news - you have progressed to the HR interview round.',
  Offered: 'We are delighted to extend an offer. A recruiter will contact you with the details.',
  Rejected: 'Thank you for your time. After careful consideration we will not be moving forward.',
  Hired: 'Welcome aboard! We are excited to have you join the team.',
};

export const listCandidates = asyncHandler(async (req, res) => {
  const { q, stage, position, skill, minExp, maxExp, from, to, sort, page, limit } = req.query;
  const filter = {};

  if (req.user.role === ROLES.INTERVIEWER) {
    filter._id = { $in: await assignedCandidateIds(req.user) };
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { position: rx }, { skills: rx }];
  }
  if (stage) filter.stage = { $in: stage.split(',').map((s) => s.trim()) };
  if (position) filter.position = new RegExp(escapeRegex(position), 'i');
  if (skill) filter.skills = new RegExp(`^${escapeRegex(skill)}$`, 'i');
  if (minExp != null || maxExp != null) {
    filter.experienceYears = {};
    if (minExp != null) filter.experienceYears.$gte = minExp;
    if (maxExp != null) filter.experienceYears.$lte = maxExp;
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const [data, total] = await Promise.all([
    Candidate.find(filter)
      .select('-notes -stageHistory')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Candidate.countDocuments(filter),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});

export const getCandidate = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id).populate('createdBy', 'name');
  if (!candidate) throw new AppError('Candidate not found', 404);
  res.json({ data: candidate });
});

export const createCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.create({
    ...req.body,
    createdBy: req.user._id,
    stageHistory: [{ stage: 'Applied', changedBy: req.user._id }],
  });
  await logActivity({
    actor: req.user,
    action: 'candidate.created',
    message: `${req.user.name} added candidate ${candidate.name} (${candidate.position})`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  await sendMail({
    to: candidate.email,
    subject: 'We received your application',
    body: `Hi ${candidate.name}, thanks for applying for ${candidate.position}. We will review your profile soon.`,
    kind: 'application_received',
  });
  res.status(201).json({ data: candidate });
});

export const updateCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!candidate) throw new AppError('Candidate not found', 404);
  await logActivity({
    actor: req.user,
    action: 'candidate.updated',
    message: `${req.user.name} updated details of ${candidate.name}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  res.json({ data: candidate });
});

export const updateStage = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  const { stage } = req.body;
  if (candidate.stage === stage) return res.json({ data: candidate });

  const previous = candidate.stage;
  candidate.stage = stage;
  candidate.stageHistory.push({ stage, changedBy: req.user._id });
  await candidate.save();

  await logActivity({
    actor: req.user,
    action: 'candidate.stage_changed',
    message: `${req.user.name} moved ${candidate.name} from ${previous} to ${stage}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
    meta: { from: previous, to: stage },
  });
  if (STAGE_EMAILS[stage]) {
    await sendMail({
      to: candidate.email,
      subject: `Application update: ${stage}`,
      body: `Hi ${candidate.name}, ${STAGE_EMAILS[stage]}`,
      kind: 'stage_change',
    });
  }
  res.json({ data: candidate });
});

export const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByIdAndDelete(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  await Promise.all([
    Interview.deleteMany({ candidate: candidate._id }),
    Feedback.deleteMany({ candidate: candidate._id }),
  ]);
  await logActivity({
    actor: req.user,
    action: 'candidate.deleted',
    message: `${req.user.name} deleted candidate ${candidate.name}`,
    entityType: 'Candidate',
  });
  res.status(204).end();
});

export const addNote = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  candidate.notes.push({
    author: req.user._id,
    authorName: req.user.name,
    role: req.user.role,
    text: req.body.text,
  });
  await candidate.save();
  await logActivity({
    actor: req.user,
    action: 'note.added',
    message: `${req.user.name} added a note on ${candidate.name}`,
    candidate: candidate._id,
    entityType: 'Candidate',
    entityId: candidate._id,
  });
  res.status(201).json({ data: candidate.notes[candidate.notes.length - 1] });
});

export const deleteNote = asyncHandler(async (req, res) => {
  await assertCandidateAccess(req.user, req.params.id);
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new AppError('Candidate not found', 404);
  const note = candidate.notes.id(req.params.noteId);
  if (!note) throw new AppError('Note not found', 404);
  const isAuthor = String(note.author) === String(req.user._id);
  if (!isAuthor && req.user.role !== ROLES.RECRUITER) throw new AppError('You can only delete your own notes', 403);
  note.deleteOne();
  await candidate.save();
  res.status(204).end();
});
