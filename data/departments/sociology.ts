import type { Department } from '../../lib/types';
import { stage } from './shared';
export const sociology: Department = {
  id: 'sociology', name: '사회학과', semester: '2026-2학기', source: '가상',
  sourceDescription: '정원이 있는 신청 방식과 복수전공 면제 요건을 설명하는 가상 데이터입니다.', verifiedAt: '2026-09-21', officialLink: '예시 링크(가상)',
  requirements: { primary: '필수', secondary: '면제' }, advisorMethod: 'application', usesCapacity: true, color: '#ac7134',
  stages: [
    stage('advisor', '지도교수 신청', '2026-09-28', 'advisor', '시스템', ['지도교수 신청서'], '남은 정원을 확인하고 연구 주제와 계획을 작성해 신청하세요.'),
    stage('proposal', '연구계획서 제출', '2026-10-23', 'submission', '시스템', ['연구계획서'], '연구 질문, 방법, 일정을 정리한 계획서를 제출하세요.'),
    stage('interim', '중간발표', '2026-11-13', 'submission', '수업', ['중간발표 자료'], '연구 경과를 발표하고 의견을 반영하세요.'),
    stage('final', '최종논문 제출', '2026-12-04', 'submission', '시스템', ['최종논문'], '최종 검토를 마친 논문을 제출하세요.'),
    stage('result', '심사 완료', '2026-12-18', 'result', '시스템', ['심사 결과서'], '행정실이 심사 결과와 요건을 확인합니다.')
  ]
};
