const SPECIES_CONFIG = {
  '和尚鹦鹉': {
    loci: {
      blue: { type: 'autosomal', label: '蓝化', symbol: 'b' },
      dark: { type: 'autosomal', label: '深色(Dark)', symbol: 'D', incomplete: true },
      ino: { type: 'sex-linked', label: '黄/白化(Ino)', symbol: 'i' },
      pallid: { type: 'sex-linked', label: '银丝(Pallid)', symbol: 'pa' },
      cinnamon: { type: 'sex-linked', label: '肉桂', symbol: 'c' },
      pied: { type: 'autosomal', label: '派特', symbol: 'p' }
    },
    colors: [
      { name: '绿和尚', genes: {} },
      { name: '蓝和尚', genes: { blue: 2 } },
      { name: '深绿和尚(1Dark)', genes: { dark: 1 } },
      { name: '橄榄绿和尚(2Dark)', genes: { dark: 2 } },
      { name: '钴蓝和尚(蓝+1Dark)', genes: { blue: 2, dark: 1 } },
      { name: '紫罗兰和尚(蓝+2Dark)', genes: { blue: 2, dark: 2 } },
      { name: '黄和尚(Lutino)', genes: { ino: 1 } },
      { name: '白和尚(Albino)', genes: { blue: 2, ino: 1 } },
      { name: '肉桂绿和尚', genes: { cinnamon: 1 } },
      { name: '肉桂蓝和尚', genes: { blue: 2, cinnamon: 1 } },
      { name: '银丝和尚', genes: { pallid: 1 } },
      { name: '蓝银丝和尚', genes: { blue: 2, pallid: 1 } },
      { name: '派特绿和尚', genes: { pied: 2 } },
      { name: '派特蓝和尚', genes: { blue: 2, pied: 2 } }
    ]
  },
  '小太阳鹦鹉': {
    loci: {
      turquoise: { type: 'autosomal', label: '蓝化', symbol: 't' },
      dilute: { type: 'autosomal', label: '稀释(Dilute)', symbol: 'd' },
      cinnamon: { type: 'sex-linked', label: '肉桂', symbol: 'c' },
      opaline: { type: 'sex-linked', label: '黄边', symbol: 'o' },
      pied: { type: 'autosomal', label: '派特', symbol: 'p' }
    },
    colors: [
      { name: '绿颊小太阳（原始）', genes: {} },
      { name: '黄边小太阳', genes: { opaline: 1 } },
      { name: '肉桂小太阳', genes: { cinnamon: 1 } },
      { name: '凤梨小太阳', genes: { opaline: 1, cinnamon: 1 } },
      { name: '蓝化小太阳', genes: { turquoise: 2 } },
      { name: '蓝化黄边', genes: { turquoise: 2, opaline: 1 } },
      { name: '蓝化肉桂', genes: { turquoise: 2, cinnamon: 1 } },
      { name: '蓝化凤梨', genes: { turquoise: 2, opaline: 1, cinnamon: 1 } },
      { name: '香吉士(美国黄/稀释)', genes: { dilute: 2 } },
      { name: '月亮(Mint/蓝化稀释)', genes: { turquoise: 2, dilute: 2 } },
      { name: 'Suncheek(阳曦/凤梨稀释)', genes: { dilute: 2, opaline: 1, cinnamon: 1 } },
      { name: 'Mooncheek(月光/蓝化凤梨稀释)', genes: { turquoise: 2, dilute: 2, opaline: 1, cinnamon: 1 } },
      { name: '派特小太阳', genes: { pied: 2 } }
    ]
  },
  '牡丹鹦鹉': {
    loci: {
      blue: { type: 'autosomal', label: '蓝化(g)', symbol: 'g' },
      ino: { type: 'sex-linked', label: '黄化(y)', symbol: 'y' },
      edged: { type: 'autosomal', label: '黄边(Ye)', symbol: 'Ye', incomplete: true },
      white: { type: 'autosomal', label: '白化(w)', symbol: 'w' },
      white_face: { type: 'autosomal', label: '白面(Wf)', symbol: 'Wf', incomplete: true },
      cinnamon: { type: 'sex-linked', label: '肉桂(c)', symbol: 'c' },
      cinnamon_aus: { type: 'sex-linked', label: '澳桂(c_aus)', symbol: 'c_aus' },
      fallow: { type: 'autosomal', label: '澳闪(fl)', symbol: 'fl' },
      silver: { type: 'autosomal', label: '银丝(s)', symbol: 's' },
      pied_dom: { type: 'autosomal', label: '派特(P)', symbol: 'P', incomplete: true }
    },
    colors: [
      { name: '野生型（绿桃）', genes: {} },
      { name: '蓝银顶', genes: { blue: 2 } },
      { name: '绿金顶', genes: { blue: 1 } },
      { name: '黄桃（黄化）', genes: { ino: 1 } },
      { name: '黄边桃', genes: { edged: 1 } },
      { name: '白桃（白化）', genes: { white: 2 } },
      { name: '白面桃', genes: { white_face: 1 } },
      { name: '肉桂桃', genes: { cinnamon: 1 } },
      { name: '银丝桃', genes: { silver: 2 } },
      { name: '派特桃', genes: { pied_dom: 1 } },
      { name: '苹果绿澳桂(红面澳桂)', genes: { cinnamon_aus: 1 } },
      { name: '白面澳桂', genes: { cinnamon_aus: 1, white_face: 1 } },
      { name: '红面澳闪', genes: { fallow: 2 } },
      { name: '蓝化黄边', genes: { blue: 2, edged: 1 } },
      { name: '白化派特', genes: { white: 2, pied_dom: 1 } },
      { name: '肉桂蓝化', genes: { cinnamon: 1, blue: 2 } }
    ]
  }
}

const SPECIES_LIST = Object.keys(SPECIES_CONFIG)

function getColorsBySpeciesName(name) {
  const cfg = SPECIES_CONFIG[name]
  return cfg ? cfg.colors.map(c => c.name) : []
}

module.exports = {
  SPECIES_CONFIG,
  SPECIES_LIST,
  getColorsBySpeciesName
}
