export const landmarks = [
  { id: 'pine', name: '松间月', line: '明月松间照', pair: '清泉石上流。', x: 14, z: 15, description: '雨后的松林澄净如洗，月光穿过枝叶，落下一地清辉。停在这里，让目光循着松影，慢慢望向远山。', icon: 'pine' },
  { id: 'stream', name: '石上泉', line: '清泉石上流', pair: '明月松间照。', x: 7, z: 0, description: '清泉从山石间淌过。月色是静的，泉水是动的；一静一动之间，山中秋夜有了清澈的呼吸。', icon: 'water' },
  { id: 'bamboo', name: '竹林语', line: '竹喧归浣女', pair: '莲动下渔舟。', x: 11, z: -17, description: '竹林中传来归人的笑语。未见其人，先闻其声；幽静的山林里，也有温暖而鲜活的日常。', icon: 'bamboo' },
  { id: 'boat', name: '莲下舟', line: '莲动下渔舟', pair: '竹喧归浣女。', x: 1, z: -35, description: '莲叶轻轻摇动，一叶渔舟顺流而下。走到水边，回望来时的松林，把这一刻的山色留在心里。', icon: 'boat' },
] as const;
export const fullPoem = ['空山新雨后，天气晚来秋。','明月松间照，清泉石上流。','竹喧归浣女，莲动下渔舟。','随意春芳歇，王孙自可留。'];
export type Mode = 'view' | 'walk';
