import React from 'react';

// Mock Data for Topics
const weeklyTopics = [
  {
    topic: '영양제 궁합',
    sources: ['건강상담소', '영양제포럼'],
    summary: '비타민 C와 콜라겐은 함께 복용 시 흡수율이 높아져 피부 건강에 더 효과적입니다. 반면, 철분과 칼슘은 서로 흡수를 방해할 수 있어 시간 간격을 두고 섭취하는 것이 권장됩니다...',
  },
  {
    topic: '오메가3 고르는 법',
    sources: ['4050 건강채널', '영양제포럼'],
    summary: '오메가3 선택 시에는 원료의 출처와 순도, 그리고 rTG 형태인지 확인하는 것이 중요합니다. 특히, 중금속 오염 가능성이 적은 소형 어종에서 추출한 제품이 안전하며...',
  },
  {
    topic: '숙면에 좋은 차',
    sources: ['마음챙김방', '일상대화'],
    summary: '카페인이 없는 루이보스나 캐모마일 차는 심신 안정에 도움을 주어 숙면을 유도하는 데 효과적입니다. 특히 캐모마일의 아피게닌 성분은 불안 감소에 기여하여...',
  },
];

const dailyTopics = [
  { topic: '혈압 관리', sources: ['고혈압연구소'], summary: '가정용 혈압계 사용 시, 매일 아침 같은 시간에 측정하고 5분간 안정을 취한 후 측정하는 것이 정확합니다...' },
  { topic: '비타민D 복용 시간', sources: ['건강상담소'], summary: '비타민D는 지용성이므로 식후, 특히 지방이 포함된 식사와 함께 복용할 때 흡수율이 가장 높습니다...' },
  { topic: '코엔자임 Q10', sources: ['영양제포럼'], summary: '코엔자임 Q10은 항산화 작용과 에너지 생성에 중요한 역할을 하며, 특히 스타틴 계열 약물 복용 시 감소할 수 있어 보충이 권장됩니다...' },
  { topic: '저탄고지 식단', sources: ['다이어트클럽'], summary: '초기 저탄고지 식단에서 발생할 수 있는 두통과 피로감은 전해질 부족 때문일 수 있으므로, 충분한 수분과 미네랄 섭취가 중요합니다...' },
  { topic: '공복 유산소', sources: ['헬스/운동', '다이어트클럽'], summary: '체지방 감량을 목표로 할 때 공복 유산소 운동이 효과적일 수 있으나, 근손실의 위험도 있어 운동 전 BCAA를 섭취하는 것이 도움이 될 수 있습니다...' },
];

const TopicCard = ({ topic, sources, summary }: { topic: string; sources: string[]; summary: string; }) => (
  <div className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow duration-200">
    <div className="mb-2">
      <span className="text-lg font-bold text-gray-800">{topic}</span>
    </div>
    <div className="mb-3">
      <span className="text-xs text-gray-500">출처: {sources.join(', ')}</span>
    </div>
    <p className="text-gray-600 text-sm">{summary}</p>
  </div>
);

const AllPopularTopics: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Weekly Popular Topics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">주간 인기 토픽</h2>
        <div className="space-y-4">
          {weeklyTopics.map((item, index) => (
            <TopicCard key={`weekly-${index}`} {...item} />
          ))}
        </div>
      </div>

      {/* Daily Popular Topics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">일일 인기 토픽</h2>
        <div className="space-y-4">
          {dailyTopics.map((item, index) => (
            <TopicCard key={`daily-${index}`} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllPopularTopics;