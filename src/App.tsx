import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { domains } from './data/features'
import { familyMeta, identities, identityById, publicIdentities } from './data/identitySystem'
import { questionBankMeta, questionById } from './data/questionBank'
import { calculateResult, createResultSnapshot, restoreResult } from './engine/identityEngine'
import { nextQuestionId, progressFor } from './engine/questionEngine'
import type { AnswerValue, IdentityDefinition, IdentityEvaluation, QuizResult, QuizState } from './types'

const STORE = 'gugugaga-identity:v6'
const freshState = (): QuizState => ({
  version: 6,
  currentIndex: 0,
  route: ['G01'],
  answers: {},
  startedAt: new Date().toISOString(),
  completed: false,
  revealSeen: false,
})

function loadState(): QuizState | null {
  try {
    const state = JSON.parse(localStorage.getItem(STORE) || 'null') as QuizState | null
    return state?.version === 6 && Array.isArray(state.route) ? state : null
  } catch {
    return null
  }
}

function Mark({ compact = false }: { compact?: boolean }) {
  return <span className={`brandMark ${compact ? 'compact' : ''}`} aria-hidden="true"><b>guga</b></span>
}

function Spark() {
  return <svg className="spark" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3c3 17 10 24 29 29-19 5-26 12-29 29-3-17-10-24-29-29C22 27 29 20 32 3Z" /></svg>
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return null
}

function Shell({ children, quiet = false }: { children: React.ReactNode; quiet?: boolean }) {
  return <div className={`appShell ${quiet ? 'quiet' : ''}`}>
    {!quiet && <header className="siteHeader">
      <Link className="siteBrand" to="/"><span><b>咕咕嘎嘎</b><small>二游玩家人格研究所</small></span></Link>
      <nav aria-label="主导航">
        <Link to="/identities">人格图鉴</Link>
        <Link to="/principles">判定原理</Link>
        <Link className="navTest" to="/intro">开始鉴定</Link>
      </nav>
    </header>}
    {children}
    {!quiet && <footer className="siteFooter"><span>GUGUGAGA · PLAYER PERSONALITY LAB</span><span>人格描述的是当下的游玩方式，不是给你定型。</span></footer>}
  </div>
}

function IdentityImage({ identity, eager = false, thumbnail = false }: { identity: IdentityDefinition; eager?: boolean; thumbnail?: boolean }) {
  const source = thumbnail ? identity.thumbnailImage || identity.image : identity.image || identity.thumbnailImage
  if (!source) return <div className="imageMissing"><Spark/><span>形象档案待补充</span></div>
  return <img src={source} alt={`${identity.name}人格形象`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}

function Home({ state, begin }: { state: QuizState | null; begin: (resume: boolean) => void }) {
  const hasProgress = Boolean(state && !state.completed && Object.keys(state.answers).length)
  return <Shell>
    <main className="home">
      <section className="hero">
        <div className="shape shapeSquare"/><div className="shape shapeCircle"/><div className="shape shapeTriangle"/>
        <div className="heroCopy">
          <span className="eyebrow">73 IDENTITIES / ADAPTIVE TEST</span>
          <h1>领取你的<br/><em>二游人格档案</em></h1>
          <p>不是把你塞进唯一的类型盒子，而是从角色、玩法、投入与社区习惯中，找出真正与你共鸣的多面人格。</p>
          <div className="heroActions">
            <button className="primaryButton" onClick={() => begin(hasProgress)}>{hasProgress ? '继续人格测试' : '开始人格测试'} <span>→</span></button>
            <Link className="textLink" to="/identities">先逛逛 73 份人格档案</Link>
          </div>
          <div className="heroMeta"><span>约 5–8 分钟</span><span>动态 27–35 题</span><span>无需登录</span></div>
        </div>
        <div className="heroVisual" aria-hidden="true">
          <div className="heroHalo"/>
          <div className="fileCard back"><span>角色 · 内容 · 投入 · 同好</span></div>
          <div className="fileCard front">
            <header><Mark compact/><span>PERSONALITY<br/>ARCHIVE</span><i>73</i></header>
            <div className="filePortrait"><Spark/><b>你会抽到<br/>哪些人格？</b></div>
            <footer><span>GOLD · CORE</span><span>PURPLE · RESONANCE</span></footer>
          </div>
          <span className="floatNote one">多面人格结果</span>
          <span className="floatNote two">73 种玩家人格</span>
        </div>
      </section>
      <section className="homeManifest">
        <article><i>01</i><h2>真正懂二游</h2><p>角色羁绊、抽卡取舍、长草回坑、高难配队、二创吃瓜，都来自真实游玩场景。</p></article>
        <article><i>02</i><h2>结果不止一个</h2><p>金色卡是证据充分的核心人格，紫色卡是方向明显的共鸣人格，不强凑数量。</p></article>
        <article><i>03</i><h2>没玩过不扣分</h2><p>“游戏没有”和“不喜欢”被严格分开；佛系也不等于对游戏没有感情。</p></article>
      </section>
      <section className="homeAtlas">
        <div><span className="eyebrow">PERSONALITY PREVIEW</span><h2>你可能认识这样的自己</h2></div>
        <div className="previewRail">{publicIdentities.filter((_, index) => [0, 22, 33, 49, 64].includes(index)).map((identity) =>
          <Link to={`/identity/${identity.id}`} key={identity.id} style={{ '--a': identity.theme[0], '--b': identity.theme[1] } as React.CSSProperties}>
            <IdentityImage identity={identity} thumbnail/><span>{identity.familyName}</span><b>{identity.name}</b>
          </Link>)}</div>
      </section>
    </main>
  </Shell>
}

function Intro({ start }: { start: () => void }) {
  return <Shell>
    <main className="introPage">
      <div className="introLead"><span className="eyebrow">BEFORE WE START</span><h1>先说四件小事</h1><p>你的路线会随着回答改变，因此不同玩家看到的题目并不完全相同。</p></div>
      <section className="introRules">
        <article><i>01</i><h2>可以同时拥有多面人格</h2><p>金卡与紫卡共同组成你的人格档案，没有“唯一正确类型”。</p></article>
        <article><i>02</i><h2>没有标准答案</h2><p>按最近半年的真实习惯回答，比选择“理想中的自己”更准确。</p></article>
        <article><i>03</i><h2>没玩过就是没玩过</h2><p>遇到没接触过或不适用的玩法，可以直接如实选择，不会影响其他部分的判断。</p></article>
        <article><i>04</i><h2>不比较氪金多少</h2><p>测试只讨论时间、精力和资源决策，不询问金额，也不鼓励消费。</p></article>
      </section>
      <button className="primaryButton introStart" onClick={start}>开始人格测试 <span>→</span></button>
    </main>
  </Shell>
}

function Quiz({ state, save }: { state: QuizState | null; save: (state: QuizState) => void }) {
  const navigate = useNavigate()
  const current = state || freshState()
  const question = questionById[current.route[current.currentIndex]]
  const [pending, setPending] = useState(false)
  const selected = question ? current.answers[question.id] : undefined
  const selectedList = Array.isArray(selected) ? selected : selected ? [selected] : []
  const progress = progressFor(current.route, current.currentIndex)

  useEffect(() => { if (!state) save(current) }, [state, save, current])
  if (current.completed) return <Navigate to={current.revealSeen ? '/result' : '/analyze'} replace/>
  if (!question) return <Navigate to="/" replace/>

  const commit = (value: AnswerValue) => {
    const retainedRoute = current.route.slice(0, current.currentIndex + 1)
    const retained = new Set(retainedRoute)
    const answers = Object.fromEntries(Object.entries(current.answers).filter(([id]) => retained.has(id)))
    answers[question.id] = value
    const next = nextQuestionId(answers, retainedRoute)
    if (next && retainedRoute.length < questionBankMeta.hardCap) {
      save({ ...current, answers, route: [...retainedRoute, next], currentIndex: current.currentIndex + 1 })
      setPending(false)
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      return
    }
    const resultSnapshot = createResultSnapshot(calculateResult(answers))
    save({ ...current, answers, route: retainedRoute, completed: true, resultSnapshot })
    navigate('/analyze')
  }

  const chooseSingle = (id: string) => {
    if (pending) return
    setPending(true)
    save({ ...current, answers: { ...current.answers, [question.id]: id } })
    window.setTimeout(() => commit(id), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220)
  }

  const toggle = (id: string) => {
    if (!question.multiple) return
    const option = question.options.find((item) => item.id === id)
    let next = [...selectedList]
    if (option?.special) next = next.includes(id) ? [] : [id]
    else {
      next = next.filter((item) => !['NONE', 'NA'].includes(item))
      next = next.includes(id) ? next.filter((item) => item !== id) : [...next, id].slice(0, question.max)
    }
    save({ ...current, answers: { ...current.answers, [question.id]: next } })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (question.multiple || pending) return
      const number = Number(event.key)
      const option = question.options[number - 1]
      if (option) chooseSingle(option.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const stage = question.stage === 'gate' ? ['入口校准', '先确认哪些场景属于你'] :
    question.stage === 'core' ? ['共享核心', '描出角色、玩法与节律轮廓'] :
      question.stage === 'route' ? ['人格方向', '正在追问更像你的那一部分'] : ['档案确认', '最后确认人格侧面与复合倾向']

  return <Shell quiet>
    <main className="quizPage">
      <header className="quizHeader">
        <Link to="/" className="quizBrand"><span>咕咕嘎嘎 · 人格测试中</span></Link>
        <div className="quizStage"><small>{stage[0]}</small><b>{stage[1]}</b></div>
        <button onClick={() => navigate('/')}>暂存并返回</button>
      </header>
      <div className="progressTrack"><i style={{ width: `${Math.max(3, progress)}%` }}/></div>
      <section className="quizBody">
        <aside className="questionIndex"><span>QUESTION</span><b>{String(current.currentIndex + 1).padStart(2, '0')}</b><small>动态题路</small></aside>
        <div className="questionPanel">
          <span className="eyebrow">{question.multiple ? `MULTIPLE · 最多选择 ${question.max} 项` : 'CHOOSE THE CLOSEST ONE'}</span>
          <h1>{question.prompt}</h1>
          <div className="optionList" role={question.multiple ? 'group' : 'radiogroup'}>
            {question.options.map((option, index) => {
              const active = selectedList.includes(option.id)
              return <button
                key={option.id}
                className={`${active ? 'active' : ''} ${option.special ? 'special' : ''}`}
                role={question.multiple ? 'checkbox' : 'radio'}
                aria-checked={active}
                onClick={() => question.multiple ? toggle(option.id) : chooseSingle(option.id)}
              ><i>{String(index + 1).padStart(2, '0')}</i><span>{option.label}</span><b>{active ? '✓' : '↗'}</b></button>
            })}
          </div>
          <div className="questionActions">
            <button className="previousButton" disabled={current.currentIndex === 0} onClick={() => save({ ...current, currentIndex: current.currentIndex - 1 })}>← 上一题</button>
            {question.multiple && <button className="primaryButton confirmButton" disabled={selectedList.length < question.min} onClick={() => commit(selectedList)}>
              确认这 {selectedList.length} 项 <span>→</span>
            </button>}
          </div>
        </div>
      </section>
      <footer className="quizFooter">
        <span>答案已自动保存在本机 · 进度会随题路平滑变化</span>
        <small>{Math.round(progress)}%</small>
      </footer>
    </main>
  </Shell>
}

function Analyze({ state }: { state: QuizState | null }) {
  const navigate = useNavigate()
  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/reveal'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 2100)
    return () => clearTimeout(timer)
  }, [navigate])
  if (!state?.completed) return <Navigate to="/" replace/>
  return <Shell quiet><main className="analyzePage">
    <div className="archiveMachine" aria-hidden="true">
      <i className="archiveSheet sheetOne"/><i className="archiveSheet sheetTwo"/>
      <div className="archiveFolder">
        <header><span>GUGA PERSONALITY LAB</span><b>FILE</b></header>
        <div className="archiveSignals"><i/><i/><i/><i/></div>
        <div className="archiveStamp"><Spark/><b>人格档案</b></div>
      </div>
    </div>
    <span className="eyebrow">PERSONALITY MATCHING</span>
    <h1>正在装订你的人格档案</h1>
    <p>把刚才的选择，整理成与你相呼应的人格卡</p>
    <div className="analyzeSteps" role="status" aria-live="polite"><span>读取选择</span><span>整理偏好</span><span>装订人格档案</span></div>
  </main></Shell>
}

function IdentityCard({ evaluation, compact = false }: { evaluation: IdentityEvaluation; compact?: boolean }) {
  const { identity } = evaluation
  return <article className={`identityCard ${evaluation.rarity} ${compact ? 'compact' : ''}`} style={{ '--a': identity.theme[0], '--b': identity.theme[1] } as React.CSSProperties}>
    <div className="identityImage"><IdentityImage identity={identity} eager={!compact} thumbnail/><span>{evaluation.rarity === 'gold' ? 'CORE' : 'RESONANCE'}</span></div>
    <div className="identityCardCopy"><small>{identity.familyName}</small><h2>{identity.name}</h2><p>{identity.resonanceQuote}</p><footer><span>{evaluation.rarity === 'gold' ? '核心人格' : '共鸣人格'}</span><span>与你的选择相呼应</span></footer></div>
  </article>
}

function Reveal({ state, save }: { state: QuizState | null; save: (state: QuizState) => void }) {
  const navigate = useNavigate()
  const result = useMemo(() => state?.completed ? restoreResult(state.answers, state.resultSnapshot) : null, [state])
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [gallery, setGallery] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)
  const landingRef = useRef<HTMLSpanElement>(null)
  const queue = useMemo(() => {
    if (!result) return []
    const gold = (result.gold.length ? result.gold : [result.primary]).map((item) => ({ ...item, rarity: result.gold.length ? 'gold' as const : 'purple' as const }))
    const goldIds = new Set(gold.map((item) => item.identity.id))
    const purple = result.purple.filter((item) => !goldIds.has(item.identity.id)).map((item) => ({ ...item, rarity: 'purple' as const }))
    return [...purple, ...gold]
  }, [result])
  const current = queue[cardIndex]

  useEffect(() => {
    if (!current || gallery) return
    setFlipped(false)
    setCollecting(false)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setFlipped(true), reduce ? 80 : 3000)
    return () => window.clearTimeout(timer)
  }, [cardIndex, current, gallery])

  useLayoutEffect(() => {
    if (!collecting) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame = window.requestAnimationFrame(() => {
      const card = cardRef.current
      const source = card?.getBoundingClientRect()
      const target = landingRef.current?.getBoundingClientRect()
      if (card && source && target && target.width > 0 && !reduce) {
        card.style.setProperty('--fly-x', `${target.left - source.left}px`)
        card.style.setProperty('--fly-y', `${target.top - source.top}px`)
        card.style.setProperty('--fly-sx', `${target.width / source.width}`)
        card.style.setProperty('--fly-sy', `${target.height / source.height}`)
        card.style.transform = `translate(${target.left - source.left}px, ${target.top - source.top}px) scale(${target.width / source.width}, ${target.height / source.height})`
        card.style.filter = 'saturate(.82)'
      }
    })
    const timer = window.setTimeout(() => {
      if (cardIndex >= queue.length - 1) setGallery(true)
      else setCardIndex((index) => index + 1)
      setCollecting(false)
    }, reduce ? 20 : 720)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [cardIndex, collecting, queue.length])

  if (!state?.completed || !result) return <Navigate to="/" replace/>
  const advance = () => {
    if (collecting) return
    if (!flipped) {
      setFlipped(true)
      return
    }
    setCollecting(true)
  }
  const finish = () => {
    save({ ...state, revealSeen: true })
    navigate('/result')
  }
  return <Shell quiet><main className={`revealPage ${gallery ? 'is-gallery' : 'is-ritual'}`}>
    <div className="revealAtmosphere"><i/><i/><i/><i/></div>
    <header><span>咕咕嘎嘎 · 人格揭晓</span><small>{gallery ? '全部人格已经显现' : `${cardIndex + 1} / ${queue.length}`}</small></header>
    {!gallery && current ? <section className="revealRitual">
      <div className="revealCollected" aria-label="已揭晓人格"><small>已收下 {cardIndex}</small><div>{queue.slice(0, cardIndex + (collecting ? 1 : 0)).map((item, index) => <span ref={collecting && index === cardIndex ? landingRef : undefined} className={`${item.rarity} ${collecting && index === cardIndex ? 'is-landing' : ''}`} key={item.identity.id}><IdentityImage identity={item.identity} eager thumbnail/><em>{item.identity.name}</em><b>{item.rarity === 'gold' ? 'S' : 'A'}</b></span>)}</div></div>
      <button key={current.identity.id} ref={cardRef} className={`revealCardButton ${collecting ? 'is-collecting' : ''}`} onClick={advance} aria-label={flipped ? `${current.identity.name}人格卡，点击收下` : '点击翻开人格卡'}>
        <span className={`revealFlip ${flipped ? 'is-flipped' : ''} ${current.rarity}`}>
          <span className="revealCardBack"><span className="revealOrbit"/><span className="revealScan"/><Spark/><b>{current.rarity === 'gold' ? 'S' : 'A'}</b><em>PERSONALITY SIGNAL</em></span>
          <span className="revealCardFront"><span className="revealPortrait"><IdentityImage identity={current.identity} eager thumbnail/></span><span className="revealName"><b>{current.identity.name}</b></span><i className="revealRank">{current.rarity === 'gold' ? 'S' : 'A'}</i></span>
        </span>
      </button>
      <div className="revealPrompt">{flipped ? <button className="revealContinue" disabled={collecting} onClick={advance}>{cardIndex === queue.length - 1 ? '收下并查看全部人格' : '收下，继续揭晓'} <span>→</span></button> : <span>点击立即翻开 · 3 秒后自动揭晓</span>}</div>
    </section> : <section className="revealGallery">
      <div className="revealTitle"><span>PERSONALITY COLLECTION</span><h1>你的人格已经全部显现</h1><p>紫色是与你产生呼应的人格侧面，金色是这次最清晰的核心人格。</p></div>
      <div className="revealGalleryGrid">{queue.map((item) => <article className={item.rarity} key={item.identity.id}><div><IdentityImage identity={item.identity} eager thumbnail/><h2>{item.identity.name}</h2><i>{item.rarity === 'gold' ? 'S' : 'A'}</i></div></article>)}</div>
      <button className="revealContinue" onClick={finish}>打开完整人格档案 <span>→</span></button>
    </section>}
  </main></Shell>
}

function Result({ state, reset }: { state: QuizState | null; reset: () => void }) {
  const posterRef = useRef<HTMLDivElement>(null)
  const result = useMemo(() => state?.completed ? restoreResult(state.answers, state.resultSnapshot) : null, [state])
  const [busy, setBusy] = useState(false)
  if (!state?.completed || !result) return <Navigate to="/" replace/>

  const download = async () => {
    if (!posterRef.current || busy) return
    setBusy(true)
    try {
      const data = await toPng(posterRef.current, { width: 1200, height: 1600, pixelRatio: 1, cacheBust: true })
      const anchor = document.createElement('a')
      anchor.download = `咕咕嘎嘎-${result.primary.identity.name}-人格档案.png`
      anchor.href = data
      anchor.click()
    } finally { setBusy(false) }
  }

  const coreCards = result.gold.length ? result.gold : [result.primary]
  return <Shell>
    <main className="resultPage">
      <section className="resultHero">
        <div><span className="eyebrow">YOUR PLAYER PERSONALITY ARCHIVE</span><h1>你的人格档案<br/>已经归档</h1><p>这不是唯一标签，而是当前证据最充分的一组游玩方式。</p></div>
        <div className="resultStats"><b>{result.gold.length}</b><span>核心人格</span><b>{result.purple.length}</b><span>共鸣人格</span></div>
      </section>
      <section className="primaryReport" style={{ '--a': result.primary.identity.theme[0], '--b': result.primary.identity.theme[1] } as React.CSSProperties}>
        <div className="primaryReportImage"><IdentityImage identity={result.primary.identity} eager/></div>
        <div className="primaryReportCopy"><small>PRIMARY PERSONALITY / 主人格</small><h2>{result.primary.identity.name}</h2><blockquote>{result.primary.identity.resonanceQuote}</blockquote><p>{result.primary.identity.longDescription}</p><div>{result.primary.identity.typicalBehaviors.map((behavior, index) => <span key={behavior}><b>{String(index + 1).padStart(2, '0')}</b>{behavior}</span>)}</div></div>
      </section>
      <section className="resultSection">
        <div className="sectionTitle"><span>01</span><div><small>GOLDEN CORE</small><h2>核心人格</h2></div></div>
        {!result.gold.length && <p className="resultNotice">这次没有人格同时达到金卡的适配度与证据要求。下面展示的是当前最强信号；我们不会为了好看把紫卡强行升级。</p>}
        <div className="resultCards">{coreCards.map((item) => <Link key={item.identity.id} to={`/identity/${item.identity.id}`}><IdentityCard evaluation={item}/></Link>)}</div>
      </section>
      <section className="resultSection">
        <div className="sectionTitle"><span>02</span><div><small>PURPLE RESONANCE</small><h2>共鸣人格</h2></div></div>
        <div className="resonanceGrid">{result.purple.filter((item) => !coreCards.includes(item)).map((item) =>
          <Link to={`/identity/${item.identity.id}`} key={item.identity.id}><IdentityCard evaluation={item} compact/></Link>)}</div>
      </section>
      <section className="resultEvidence">
        <div className="sectionTitle"><span>03</span><div><small>WHY YOU</small><h2>为什么是「{result.primary.identity.name}」</h2></div></div>
        <div>{result.primary.evidenceItems.slice(0, 3).map((item, index) => <article key={item.questionId}><i>{String(index + 1).padStart(2, '0')}</i><p>{item.label}</p><span>这个选择与你的主人格产生了明显共鸣</span></article>)}</div>
      </section>
      <section className="resultActions">
        <button className="primaryButton" onClick={download}>{busy ? '正在生成…' : '下载分享档案'} <span>↓</span></button>
        <Link className="textLink" to="/identities">查看全部人格</Link>
        <button className="textLink" onClick={reset}>清除记录，重新鉴定</button>
      </section>
      <div className="posterWrap"><div className="sharePoster" ref={posterRef} style={{ '--a': result.primary.identity.theme[0], '--b': result.primary.identity.theme[1] } as React.CSSProperties}>
        <header><span>咕咕嘎嘎 · 二游玩家人格研究所</span><b>PERSONALITY ARCHIVE</b></header>
        <div className="posterMain">
          <div className="posterImage"><IdentityImage identity={result.primary.identity} eager/></div>
          <div className="posterCopy"><small>MY CORE PERSONALITY · 我的核心人格</small><h2>{result.primary.identity.name}</h2><blockquote>{result.primary.identity.resonanceQuote}</blockquote><p>{result.primary.identity.longDescription}</p></div>
        </div>
        <div className="posterBehaviors"><strong>你可能很熟悉这些瞬间</strong>{result.primary.identity.typicalBehaviors.map((behavior, index) => <span key={behavior}><b>{String(index + 1).padStart(2, '0')}</b>{behavior}</span>)}</div>
        <div className="posterTags"><strong>与你共鸣</strong>{coreCards.slice(1, 4).map((item) => <span key={item.identity.id}>{item.identity.name}</span>)}{result.purple.slice(0, 3).map((item) => <span key={item.identity.id}>{item.identity.name}</span>)}</div>
        <footer><span>73 PLAYER PERSONALITIES</span><span>GUGUGAGA 2026</span></footer>
      </div></div>
    </main>
  </Shell>
}

function IdentitiesPage() {
  const [family, setFamily] = useState('ALL')
  const [query, setQuery] = useState('')
  const filtered = identities.filter((identity) =>
    (family === 'ALL' || identity.familyId === family) &&
    (!query || identity.name.includes(query) || identity.summary.includes(query) || identity.longDescription.includes(query)))
  return <Shell><main className="atlasPage">
    <section className="atlasHero"><span className="eyebrow">73 PLAYER PERSONALITIES</span><h1>人格图鉴</h1><p>这里收录了 73 种熟悉的二游生活切片。按兴趣浏览，点开任意人格，看看它有没有说中你。</p></section>
    <div className="atlasTools">
      <div className="familyTabs"><button className={family === 'ALL' ? 'active' : ''} onClick={() => setFamily('ALL')}>全部 <i>73</i></button>{Object.entries(familyMeta).map(([id, item]) =>
        <button key={id} className={family === id ? 'active' : ''} onClick={() => setFamily(id)}>{item.name}</button>)}</div>
      <label><span>搜索人格</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：本命 / 剧情 / 高难"/></label>
    </div>
    <section className="identityGrid">{filtered.map((identity) =>
      <Link key={identity.id} to={`/identity/${identity.id}`} className="atlasIdentity" style={{ '--a': identity.theme[0], '--b': identity.theme[1] } as React.CSSProperties}>
        <div><IdentityImage identity={identity} thumbnail/></div>
        <small>{identity.familyName}</small><h2>{identity.name}</h2><p>{identity.resonanceQuote}</p><b>查看人格档案</b>
      </Link>)}</section>
  </main></Shell>
}

function IdentityDetail() {
  const { id = '' } = useParams()
  const identity = identityById[id]
  const [preview, setPreview] = useState(false)
  if (!identity) return <Navigate to="/identities" replace/>
  const related = identities.filter((item) => item.familyId === identity.familyId && item.id !== identity.id).slice(0, 4)
  return <Shell><main className="detailPage" style={{ '--a': identity.theme[0], '--b': identity.theme[1] } as React.CSSProperties}>
    <section className="detailHero">
      <div className="detailImage"><IdentityImage identity={identity} eager/></div>
      <div className="detailCopy"><span className="eyebrow">{identity.familyName}</span><h1>{identity.name}</h1><blockquote>{identity.resonanceQuote}</blockquote><p>{identity.longDescription}</p><button className="outlineButton" onClick={() => setPreview(true)}>预览抽卡揭晓效果</button></div>
    </section>
    <section className="behaviorPanel">
      <header><span>PLAYER CHECKLIST</span><h2>你可能很熟悉这些瞬间</h2></header>
      <div>{identity.typicalBehaviors.map((behavior, index) => <article key={behavior}><b>{String(index + 1).padStart(2, '0')}</b><p>{behavior}</p></article>)}</div>
    </section>
    <section className="related"><div className="sectionTitle"><span>+</span><div><small>KEEP EXPLORING</small><h2>你也可能会喜欢</h2></div></div><div>{related.map((item) => <Link key={item.id} to={`/identity/${item.id}`}><IdentityImage identity={item} thumbnail/><span>{item.name}</span></Link>)}</div></section>
    {preview && <PreviewReveal identity={identity} close={() => setPreview(false)}/>} 
  </main></Shell>
}

function PreviewReveal({ identity, close }: { identity: IdentityDefinition; close: () => void }) {
  const evaluation: IdentityEvaluation = { identity, fit: 92, evidenceConfidence: .92, distinctEvidenceItems: 3, status: 'GOLD', rarity: 'gold', evidenceItems: [], rankScore: 92 }
  return <div className="previewModal" role="dialog" aria-modal="true"><button className="modalClose" onClick={close}>×</button><div className="previewBurst"/><IdentityCard evaluation={evaluation}/><button className="revealContinue" onClick={close}>返回人格档案</button></div>
}

function Principles() {
  return <Shell><main className="principlesPage">
    <section className="principlesHero"><span className="eyebrow">HOW IT WORKS</span><h1>你的人格结果<br/>是怎样出现的</h1><p>我们会综合你在不同游戏情境里的选择，寻找反复出现的偏好，再整理成一组当下与你最共鸣的玩家人格。</p></section>
    <section className="engineFlow"><article><i>01</i><b>先了解经历</b><p>没接触过的玩法可以如实跳过，不会被当成不喜欢。</p></article><article><i>02</i><b>再观察选择</b><p>角色、玩法、投入和同好互动，会从多个情境中彼此印证。</p></article><article><i>03</i><b>寻找稳定偏好</b><p>单次选择不会定型，重复出现的游玩习惯更重要。</p></article><article><i>04</i><b>给出多面结果</b><p>你可以同时拥有核心人格与共鸣人格，不必被塞进唯一盒子。</p></article></section>
    <section className="domainSection"><div className="sectionTitle"><span>4</span><div><small>WHAT WE NOTICE</small><h2>我们关注的四种体验</h2></div></div><div className="domainGrid">{Object.values(domains).map((domain) =>
      <article key={domain.name} style={{ '--domain': domain.color } as React.CSSProperties}><header><b>✦</b><span>{domain.english}</span></header><h2>{domain.name}</h2><p>{domain.description}</p></article>)}</div></section>
    <section className="principlesNote"><b>关于结果</b><p>这里的“人格”描述的是你现阶段的二游偏好与游玩方式，不是心理诊断，也不是永久标签；我们不会因为某种玩法、投入方式或社交偏好判断玩家高低。</p><Link className="primaryButton" to="/intro">开始人格测试 <span>→</span></Link></section>
  </main></Shell>
}

export default function App() {
  const navigate = useNavigate()
  const [state, setLocalState] = useState<QuizState | null>(loadState)
  const save = useCallback((next: QuizState) => {
    setLocalState(next)
    localStorage.setItem(STORE, JSON.stringify(next))
  }, [])
  const begin = (resume: boolean) => {
    if (!resume) save(freshState())
    navigate(resume ? '/test' : '/intro')
  }
  const start = () => {
    const next = state && !state.completed ? state : freshState()
    save(next)
    navigate('/test')
  }
  const reset = () => {
    localStorage.removeItem(STORE)
    setLocalState(null)
    navigate('/')
  }
  return <><ScrollTop/><Routes>
    <Route path="/" element={<Home state={state} begin={begin}/>}/>
    <Route path="/intro" element={<Intro start={start}/>}/>
    <Route path="/test" element={<Quiz state={state} save={save}/>}/>
    <Route path="/analyze" element={<Analyze state={state}/>}/>
    <Route path="/reveal" element={<Reveal state={state} save={save}/>}/>
    <Route path="/result" element={<Result state={state} reset={reset}/>}/>
    <Route path="/identities" element={<IdentitiesPage/>}/>
    <Route path="/identity/:id" element={<IdentityDetail/>}/>
    <Route path="/principles" element={<Principles/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></>
}
