
import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { VoiceMetrics, Language } from '../types';

interface VoiceRadarProps {
  metrics: VoiceMetrics;
  language: Language;
}

const VoiceRadar: React.FC<VoiceRadarProps> = ({ metrics, language }) => {
  
  const labels = {
    en: { clarity: 'Clarity', charisma: 'Charisma', uniqueness: 'Uniqueness', stability: 'Stability', warmth: 'Warmth' },
    zh: { clarity: '清晰度', charisma: '魅力值', uniqueness: '独特性', stability: '稳定性', warmth: '温暖度' }
  };

  const l = labels[language];

  const data = [
    { subject: l.clarity, A: metrics.clarity, fullMark: 100 },
    { subject: l.charisma, A: metrics.charisma, fullMark: 100 },
    { subject: l.uniqueness, A: metrics.uniqueness, fullMark: 100 },
    { subject: l.stability, A: metrics.stability, fullMark: 100 },
    { subject: l.warmth, A: metrics.warmth, fullMark: 100 },
  ];

  return (
    <div className="w-full h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500, fontFamily: 'Inter' }} 
          />
          <Radar
            name="Stats"
            dataKey="A"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="#06b6d4"
            fillOpacity={0.3}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#18181b', 
              borderColor: '#27272a', 
              color: '#f4f4f5',
              fontSize: '12px',
              borderRadius: '8px',
              fontFamily: 'Inter',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            itemStyle={{ color: '#06b6d4' }}
            formatter={(value: number) => [`${value}/100`, language === 'zh' ? '得分' : 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VoiceRadar;
