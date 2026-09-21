export type Requirement = '필수' | '면제';
export type Method = 'contact_approval' | 'application' | 'course_assigned';
export type Stage = {
  id: string; name: string; description: string; deadline: string;
  documents: string[]; form: string; submission: '시스템' | '이메일' | '수업';
  evidence: string; notice: string; contact: string;
  kind: 'advisor' | 'course' | 'submission' | 'result';
};
export type Department = {
  id: string; name: string; semester: string; source: '실제 공지' | '일부 가정' | '가상';
  sourceDescription: string; verifiedAt: string; officialLink: string;
  requirements: { primary: Requirement | ''; secondary: Requirement | '' };
  advisorMethod: Method; usesCapacity: boolean; color: string; stages: Stage[];
};
export type Major = { departmentId: string; type: 'primary' | 'secondary' };
export type ApplicationStatus = '대기' | '수정 요청' | '면담 요청' | '승인' | '반려';
export type ReviewStatus = '검토 대기' | '보완 요청' | '검토 완료';
export type Application = {
  professorId: string; status: ApplicationStatus; feedback: string; contacted: boolean;
  topic: string; plan: string; requestedAt: string; review: ReviewStatus; reviewFeedback: string;
};
export type Roadmap = {
  departmentId: string; currentStage: number; completed: string[]; submitted: string[];
  application?: Application;
};
export type Student = {
  id: string; name: string; number: string; graduation: string; configured: boolean;
  majors: Major[]; roadmaps: Roadmap[];
};
export type Professor = { id: string; departmentId: string; name: string; keywords: string; preferredTopic: string; capacity: number; assigned: number };
export type History = { id: string; actor: string; at: string; content: string; studentId?: string; departmentId?: string };
export type BoardState = { students: Student[]; professors: Professor[]; history: History[] };
export type ChangeContext = { actor: string; at: string };
