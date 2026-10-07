export const ROLES = { RECRUITER: 'recruiter', INTERVIEWER: 'interviewer' };

// Order matters: this is the pipeline workflow order.
export const STAGES = [
  'Applied',
  'Screening',
  'Technical Interview',
  'HR Interview',
  'Offered',
  'Rejected',
  'Hired',
];

export const INTERVIEW_TYPES = ['screening', 'technical', 'hr'];
export const INTERVIEW_MODES = ['video', 'onsite', 'phone'];
export const INTERVIEW_STATUS = ['scheduled', 'completed', 'cancelled'];
export const RECOMMENDATIONS = ['strong_hire', 'hire', 'no_hire', 'strong_no_hire'];
