import type { Department } from '../../lib/types';
import { stage } from './shared';
export const mechanical: Department = {
  id: 'mechanical', name: '기계공학과', semester: '2026-2학기', source: '가상',
  sourceDescription: '전공 수업에서 지도교수를 배정하는 방식을 설명하는 가상 데이터입니다.', verifiedAt: '2026-09-21', officialLink: '예시 링크(가상)',
  requirements: { primary: '필수', secondary: '필수' }, advisorMethod: 'course_assigned', usesCapacity: false, color: '#5076be',
  stages: [
    stage('course', '졸업논문 수업 수강', '2026-09-24', 'course', '수업', ['수강 확인 내역'], '졸업논문 수업을 수강하고 수강 상태를 기록하세요.'),
    stage('advisor', '지도교수 배정 확인', '2026-10-02', 'advisor', '수업', ['배정 확인 내역'], '행정실이 수업의 배정 결과를 등록합니다. 학생은 별도 신청하지 않습니다.'),
    stage('interim', '중간발표', '2026-10-22', 'submission', '수업', ['중간발표 자료'], '수업에서 중간발표를 진행하고 제출 상태를 기록하세요.'),
    stage('final', '최종논문 제출', '2026-12-04', 'submission', '수업', ['최종논문'], '수업 담당자에게 최종논문을 제출하세요.'),
    stage('grade', '성적 반영', '2026-12-24', 'result', '수업', ['성적 확인 내역'], '행정실이 성적 반영 결과를 확인합니다.')
  ]
};
