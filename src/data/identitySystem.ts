import source from '../../方案/二游玩家身份系统_身份体系冻结版_v0.6.1.md?raw'
import type { IdentityCondition, IdentityDefinition, IdentityLevel } from '../types'
import { identityResultCopy } from './identityCopy'

export const familyMeta: Record<string, { name: string; short: string; color: [string, string] }> = {
  F01: { name: '角色情感结构', short: '角色为何被你记住', color: ['#e86f91', '#ffb28b'] },
  F02: { name: '角色价值与抽卡决策', short: '心动与资源怎样取舍', color: ['#d45f87', '#f2a45f'] },
  F03: { name: '本命深耕', short: '把喜欢变成长期行动', color: ['#9b6ce2', '#ef7fa5'] },
  F04: { name: '剧情·世界观·音乐', short: '进入故事与氛围', color: ['#6d72d9', '#9a8bea'] },
  F05: { name: '探索·创造·收集', short: '在世界里留下足迹', color: ['#3eaaa1', '#70c7a7'] },
  F06: { name: '战斗·构筑·效率', short: '理解规则并解决问题', color: ['#397abf', '#67b9cf'] },
  F07: { name: '养成与资源', short: '怎样把资源变成成长', color: ['#bd7d3f', '#dfb755'] },
  F08: { name: '专项玩法偏好', short: '会让你单独沉迷的模式', color: ['#6577bf', '#8fa5dc'] },
  F09: { name: '投入节律与分配', short: '时间精力如何流动', color: ['#d56f55', '#f1ad6c'] },
  F10: { name: '社区参与与信息', short: '你与同好保持多远', color: ['#4c91a8', '#73c1bd'] },
  F11: { name: '分享·创作·表达', short: '把体验变成外在表达', color: ['#9a66c1', '#df86c0'] },
}

const c = (path: string, threshold = 70, direction: 'high' | 'low' = 'high', weight = 1): IdentityCondition => ({
  path, threshold, direction, weight,
})

const rules: Record<string, IdentityCondition[]> = {
  本命真爱党: [c('R01.emotion', 60, 'high', .45), c('R02', 70, 'high', .55)],
  都是我的翅膀: [c('R01.emotion', 60), c('R02', 35, 'low')],
  版本心动派: [c('R01.emotion', 55), c('R03', 35, 'low')],
  白月光守护者: [c('R03', 70), c('R02', 60)],
  XP鉴赏家: [c('R01.xp')],
  角色故事鉴赏家: [c('R01.story'), c('C02', 60)],
  角色陪伴派: [c('R01.companion')],
  关系雷达: [c('R04')],
  演出控: [c('R01.performance')],
  强度党: [c('R01.strength')],
  手感党: [c('C14')],
  缺啥补啥党: [c('R01.strength', 55), c('C07', 65)],
  卡池规划师: [c('R05')],
  抽卡行动派: [c('R05', 35, 'low')],
  复刻守望者: [c('R06', 75)],
  玄学抽卡师: [c('DIRECT.gacha_ritual', 75)],
  本命毕业党: [c('R02', 70), c('I05', 65), c('C11', 55)],
  本命应援官: [c('R01.emotion', 55), c('S08.support', 70)],
  羁绊组队党: [c('R04', 70), c('C07', 65)],
  逆天改命党: [c('R02', 70), c('C06', 70), c('I05', 70)],
  嗑学家: [c('R04', 70), c('C02', 65), c('S04', 55), c('S07.relation', 50)],
  本命研究所长: [c('R02', 70), c('C07', 65), c('C08', 65), c('I05', 70), c('S07.guide', 65)],
  剧情沉浸党: [c('C01.story', 55), c('C02', 70)],
  入戏太深: [c('C02', 85), c('DIRECT.story_afterglow', 75)],
  世界观考古学家: [c('C01.world', 55), c('C03', 70)],
  剧情速通侠: [c('C01.story', 35), c('C12', 70), c('C02', 45, 'low')],
  OST收藏家: [c('C01.music', 65), c('C02', 45)],
  自由探索家: [c('C01.explore', 55), c('C04', 70)],
  摄影师: [c('C01.photo', 70)],
  家园建筑师: [c('C01.build', 70)],
  解谜破译员: [c('C01.puzzle', 70)],
  全收集派: [c('C01.collect', 55), c('C05', 70)],
  全面体验派: [c('C13', 70)],
  高难攻坚党: [c('C06', 70), c('I05', 65)],
  扫地僧: [c('C06', 75), c('I05', 75), c('S01', 25, 'low')],
  配队专家: [c('C07', 70)],
  原生阵容挑战者: [c('C06', 55), c('C07', 50), c('DIRECT.no_pull_challenge', 75)],
  机制党: [c('C08', 70)],
  手法磨练师: [c('C09', 75), c('I05', 70)],
  精算师: [c('C10', 75)],
  极限竞速手: [c('C06', 80), c('I05', 75), c('S03.record', 65)],
  作业速通党: [c('C12', 75)],
  自动托管党: [c('C12', 75), c('I02', 40, 'low')],
  毕业党: [c('C11', 70)],
  词条精修师: [c('C11', 80), c('I05', 75)],
  屯屯鼠: [c('C15', 70)],
  肉鸽常驻户: [c('C01.roguelike', 70)],
  卡牌大师: [c('C01.card', 70)],
  塔防指挥官: [c('C01.tower', 70)],
  日课打卡派: [c('I01', 75)],
  秒速收菜员: [c('I02', 40, 'low'), c('DIRECT.short_session', 70)],
  随心体验派: [c('I02', 40, 'low'), c('I01', 60, 'low')],
  版本活动特种兵: [c('I03.version_burst', 70)],
  版本候鸟: [c('I03.long_grass', 70), c('I03.version_burst', 70)],
  首日冲锋队: [c('I03.first_day', 75)],
  活动末日战神: [c('I03.deadline', 75)],
  二游管理大师: [c('I04', 70)],
  二游观察者: [c('I02', 25, 'low')],
  桃花源玩家: [c('S01', 25, 'low')],
  同好召集人: [c('S04', 70)],
  节奏绝缘体: [c('S01', 40), c('S09', 70)],
  吃瓜群众: [c('S03.drama', 70)],
  长评潜水员: [c('S02.long_review', 70)],
  联机气氛组: [c('S05', 70)],
  萌新引路人: [c('S06.help', 65), c('S05', 60)],
  前瞻雷达: [c('S03.info', 70)],
  闭关开荒党: [c('C01.new_content', 65), c('I03.first_day', 65), c('S10', 75)],
  攻略课代表: [c('S06.knowledge', 65), c('C07.knowledge', 45)],
  二创巡礼者: [c('S02.fanwork', 70)],
  二创住民: [c('S02.fanwork', 85), c('S02.fanwork_time_ratio', 75)],
  同人创作者: [c('S07.fanwork', 75)],
  梗图工厂: [c('S07.meme', 75)],
  晒卡党: [c('S08.gacha', 70)],
}

const parents: Record<string, string> = {
  复刻守望者: '卡池规划师',
  羁绊组队党: '关系雷达',
  入戏太深: '剧情沉浸党',
  手法磨练师: '高难攻坚党',
  精算师: '机制党',
  词条精修师: '毕业党',
  版本候鸟: '版本活动特种兵',
  首日冲锋队: '版本活动特种兵',
  活动末日战神: '版本活动特种兵',
  二创住民: '二创巡礼者',
  梗图工厂: '同人创作者',
}

const directs: Record<string, string> = {
  复刻守望者: 'DIRECT.rerun_wait',
  玄学抽卡师: 'DIRECT.gacha_ritual',
  羁绊组队党: 'DIRECT.relation_team',
  逆天改命党: 'DIRECT.favorite_highdiff',
  嗑学家: 'DIRECT.ship_analysis',
  本命研究所长: 'DIRECT.favorite_lab',
  入戏太深: 'DIRECT.story_afterglow',
  原生阵容挑战者: 'DIRECT.no_pull_challenge',
  手法磨练师: 'DIRECT.mechanics_practice',
  精算师: 'DIRECT.quant_tool',
  极限竞速手: 'DIRECT.speedrun',
  扫地僧: 'DIRECT.silent_mastery',
  词条精修师: 'DIRECT.substat_grind',
  版本候鸟: 'DIRECT.version_return',
  首日冲锋队: 'DIRECT.first_day',
  活动末日战神: 'DIRECT.deadline',
  闭关开荒党: 'DIRECT.anti_spoiler',
  二创住民: 'DIRECT.fanwork_resident',
  梗图工厂: 'DIRECT.meme_factory',
}

const imageAliases: Record<string, string[]> = {
  本命真爱党: ['01｜本命钉子户'], 版本心动派: ['02｜版本恋爱脑'], 都是我的翅膀: ['03｜都是我的翅膀'],
  白月光守护者: ['04｜白月光守护者'], 强度党: ['强度先遣队', '05｜性能经理人'], 本命毕业党: ['06｜本命雕刻师'],
  剧情沉浸党: ['08｜剧情潜水员'], 自由探索家: ['地图开荒官', '12｜自由观光客'], 全面体验派: ['多面体验派'],
  高难攻坚党: ['09｜深渊工程师'], 随心体验派: ['11｜快乐体验家'], 首日冲锋队: ['首日开荒员'],
  配队专家: ['配队实验家-配队大师', '10｜配队建筑师'], 机制党: ['机制研究员'], 作业速通党: ['作业速通员'],
  自动托管党: ['托管省心派'], 毕业党: ['养成工程师'], 日课打卡派: ['14｜日课公务员'],
  版本活动特种兵: ['15｜版本特种兵'], 二游管理大师: ['17｜多游时间管理师'], 桃花源玩家: ['19｜圈地自萌人'],
  同好召集人: ['20｜同好扩音器'], 节奏绝缘体: ['24｜节奏免疫体'], 吃瓜群众: ['吃瓜观察员-吃瓜群众'],
  攻略课代表: ['21｜攻略传教士'], 二创巡礼者: ['同人巡礼者'], 梗图工厂: ['梗图生产者-梗图制造者', '22｜梗图冲浪手'],
  关系雷达: ['关系观察员'], 玄学抽卡师: ['抽卡仪式家'], 本命应援官: ['本命应援官-本命应援组'],
  手法磨练师: ['手法磨练师-手法大师'], 精算师: ['面板计算师-精算师'], 词条精修师: ['词条精修师'],
  前瞻雷达: ['前瞻情报员'], 晒卡党: ['晒卡党'], 本命研究所长: ['本命研究所长'],
}

const fullImageModules = import.meta.glob('../../resources/identity-webp/full/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const thumbnailImageModules = import.meta.glob('../../resources/identity-webp/thumb/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

function imageEntries(modules: Record<string, string>) {
  return Object.entries(modules).map(([path, url]) => ({
    name: path.split('/').pop()?.replace(/\.webp$/i, '') || path,
    url,
  }))
}

const fullImageEntries = imageEntries(fullImageModules)
const thumbnailImageEntries = imageEntries(thumbnailImageModules)

function imageFor(name: string, entries: { name: string; url: string }[]) {
  const candidates = [name, ...(imageAliases[name] || [])]
  return entries.find((entry) => candidates.some((candidate) => entry.name === candidate || entry.name.includes(candidate)))?.url
}

function parseLevel(value: string): IdentityLevel {
  if (value.includes('隐藏')) return 'hidden'
  if (value.includes('稀有')) return 'rare_composite'
  if (value.includes('强分支')) return 'branch'
  return 'main'
}

function parseIdentities(markdown: string) {
  const result: Omit<IdentityDefinition, 'id' | 'ordinal' | 'conditions' | 'parentId' | 'requiredDirect' | 'replaceParent' | 'theme' | 'image' | 'thumbnailImage' | 'typicalBehaviors' | 'resonanceQuote' | 'longDescription'>[] = []
  let familyId = ''
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const family = line.match(/^### (F\d\d)｜(.+)$/)
    if (family) {
      familyId = family[1]
      continue
    }
    const row = line.match(/^\| \*\*(.+?)\*\* \| (.+?) \| `([01]{4})` \| (.+?) \| (.+?) \|$/)
    if (!familyId || !row) continue
    result.push({
      name: row[1],
      familyId,
      familyName: familyMeta[familyId]?.name || familyId,
      level: parseLevel(row[2]),
      mask: row[3],
      formula: row[4].replace(/\*\*/g, ''),
      summary: row[5].replace(/\*\*/g, ''),
    })
  }
  return result
}

const parsed = parseIdentities(source)
const idByName = Object.fromEntries(parsed.map((item, index) => [item.name, `ID_${item.familyId}_${String(index + 1).padStart(2, '0')}`]))

export const identities: IdentityDefinition[] = parsed.map((item, index) => ({
  ...item,
  typicalBehaviors: identityResultCopy[item.name]?.typicalBehaviors || [],
  resonanceQuote: identityResultCopy[item.name]?.resonanceQuote || item.summary,
  longDescription: identityResultCopy[item.name]?.longDescription || item.summary,
  id: idByName[item.name],
  ordinal: index + 1,
  image: imageFor(item.name, fullImageEntries),
  thumbnailImage: imageFor(item.name, thumbnailImageEntries),
  conditions: rules[item.name] || [],
  parentId: parents[item.name] ? idByName[parents[item.name]] : undefined,
  requiredDirect: directs[item.name],
  replaceParent: item.level === 'branch',
  theme: familyMeta[item.familyId]?.color || ['#7b72d8', '#ef8ca8'],
}))

export const identityById = Object.fromEntries(identities.map((identity) => [identity.id, identity])) as Record<string, IdentityDefinition>
export const identityByName = Object.fromEntries(identities.map((identity) => [identity.name, identity])) as Record<string, IdentityDefinition>
export const publicIdentities = identities.filter((identity) => identity.level !== 'hidden')
export const hiddenIdentity = identities.find((identity) => identity.level === 'hidden')!
