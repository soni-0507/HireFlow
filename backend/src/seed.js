import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Candidate from './models/Candidate.js';
import Interview from './models/Interview.js';
import Feedback from './models/Feedback.js';
import ActivityLog from './models/ActivityLog.js';
import Notification from './models/Notification.js';

const PASSWORD = 'Password123';
const hours = (h) => new Date(Date.now() + h * 3600 * 1000);

const people = [
  ['Aarav Mehta', 'Frontend Engineer', ['React', 'TypeScript', 'Tailwind'], 4, 'LinkedIn', 'Technical Interview'],
  ['Diya Nair', 'Backend Engineer', ['Node.js', 'MongoDB', 'Docker'], 5, 'Referral', 'Technical Interview'],
  ['Kabir Singh', 'Full Stack Developer', ['React', 'Node.js', 'PostgreSQL'], 3, 'Careers page', 'Screening'],
  ['Ishita Rao', 'Data Analyst', ['SQL', 'Python', 'Tableau'], 2, 'Naukri', 'Applied'],
  ['Rohan Gupta', 'DevOps Engineer', ['AWS', 'Terraform', 'Kubernetes'], 6, 'LinkedIn', 'HR Interview'],
  ['Meera Iyer', 'Product Designer', ['Figma', 'Research', 'Prototyping'], 4, 'Referral', 'Offered'],
  ['Vikram Shah', 'Backend Engineer', ['Java', 'Spring', 'Kafka'], 7, 'Agency', 'Rejected'],
  ['Ananya Das', 'Frontend Engineer', ['Vue', 'JavaScript', 'CSS'], 1, 'Campus', 'Applied'],
  ['Neha Kapoor', 'QA Engineer', ['Cypress', 'Selenium', 'API testing'], 3, 'Naukri', 'Screening'],
  ['Arjun Pillai', 'Full Stack Developer', ['React', 'Express', 'MongoDB'], 2, 'LinkedIn', 'Hired'],
  ['Sana Khan', 'Data Scientist', ['Python', 'PyTorch', 'SQL'], 5, 'Referral', 'Applied'],
  ['Tanvi Joshi', 'Frontend Engineer', ['React', 'Redux', 'Jest'], 3, 'Careers page', 'Technical Interview'],
];

async function run() {
  await connectDB();
  await Promise.all([User, Candidate, Interview, Feedback, ActivityLog, Notification].map((m) => m.deleteMany({})));

  const recruiter = await User.create({ name: 'Priya Recruiter', email: 'recruiter@demo.com', password: PASSWORD, role: 'recruiter' });
  const recruiter2 = await User.create({ name: 'Sameer Talent', email: 'recruiter2@demo.com', password: PASSWORD, role: 'recruiter' });
  const int1 = await User.create({ name: 'Nikhil Interviewer', email: 'interviewer@demo.com', password: PASSWORD, role: 'interviewer' });
  const int2 = await User.create({ name: 'Rhea Reviewer', email: 'interviewer2@demo.com', password: PASSWORD, role: 'interviewer' });

  const candidates = [];
  for (const [i, [name, position, skills, exp, source, stage]] of people.entries()) {
    candidates.push(
      await Candidate.create({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: `+91 98${String(10000000 + i * 1234567).slice(0, 8)}`,
        position,
        skills,
        experienceYears: exp,
        source,
        stage,
        createdBy: i % 2 ? recruiter2._id : recruiter._id,
        stageHistory: [{ stage: 'Applied', changedBy: recruiter._id }, ...(stage !== 'Applied' ? [{ stage, changedBy: recruiter._id }] : [])],
        notes: i < 3 ? [{ author: recruiter._id, authorName: recruiter.name, role: 'recruiter', text: 'Strong profile, prioritise this week.' }] : [],
      })
    );
  }

  const mk = (c, interviewer, offsetH, type, status = 'scheduled', mode = 'video') =>
    Interview.create({
      candidate: c._id, interviewer: interviewer._id, scheduledBy: recruiter._id,
      scheduledAt: hours(offsetH), durationMins: 60, type, mode, status,
      location: mode === 'video' ? 'https://meet.example.com/hiring' : 'HQ - Room 4B',
    });

  const upcoming = [
    await mk(candidates[0], int1, 26, 'technical'),
    await mk(candidates[1], int1, 50, 'technical'),
    await mk(candidates[2], int2, 5, 'screening', 'scheduled', 'phone'),
    await mk(candidates[4], int2, 74, 'hr', 'scheduled', 'onsite'),
    await mk(candidates[11], int1, 98, 'technical'),
  ];
  const past = [
    await mk(candidates[5], int1, -72, 'technical', 'completed'),
    await mk(candidates[9], int2, -120, 'hr', 'completed'),
    await mk(candidates[6], int2, -96, 'technical', 'completed'),
    await mk(candidates[4], int1, -30, 'technical', 'scheduled'), // overdue: feedback pending
  ];

  const fbData = [
    [past[0], int1, 5, 'strong_hire', 'Great system design and communication.', 'Limited exposure to our stack.'],
    [past[1], int2, 4, 'hire', 'Culture fit, solid fundamentals.', 'Needs mentoring on testing.'],
    [past[2], int2, 2, 'no_hire', 'Good Java knowledge.', 'Struggled with concurrency and debugging.'],
  ];
  for (const [iv, who, rating, recommendation, strengths, concerns] of fbData) {
    await Feedback.create({ interview: iv._id, candidate: iv.candidate, interviewer: who._id, rating, recommendation, strengths, concerns, comments: '' });
  }

  await ActivityLog.insertMany([
    ...candidates.slice(0, 8).map((c, i) => ({ actor: i % 2 ? recruiter2._id : recruiter._id, action: 'candidate.created', message: `${i % 2 ? recruiter2.name : recruiter.name} added candidate ${c.name} (${c.position})`, candidate: c._id, entityType: 'Candidate', entityId: c._id })),
    ...upcoming.map((iv, i) => ({ actor: recruiter._id, action: 'interview.scheduled', message: `${recruiter.name} scheduled a ${iv.type} interview for ${candidates.find((c) => String(c._id) === String(iv.candidate)).name}`, candidate: iv.candidate, entityType: 'Interview', entityId: iv._id })),
    { actor: recruiter._id, action: 'candidate.stage_changed', message: `${recruiter.name} moved Meera Iyer from HR Interview to Offered`, candidate: candidates[5]._id },
    { actor: recruiter2._id, action: 'candidate.stage_changed', message: `${recruiter2.name} moved Vikram Shah from Technical Interview to Rejected`, candidate: candidates[6]._id },
  ]);

  console.log('\nSeed complete. Demo logins (password: %s)', PASSWORD);
  console.log('  recruiter:    recruiter@demo.com / recruiter2@demo.com');
  console.log('  interviewer:  interviewer@demo.com / interviewer2@demo.com\n');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
