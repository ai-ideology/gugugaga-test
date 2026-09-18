# id-card-wall 实现说明

> 金色角色工卡 · 觉醒特效版。零依赖单文件 HTML（`gacha-fx/id-card-wall.html`），无构建、无 CDN，双击即可运行。
>
> 视觉方向：**黑卡 + 金色** —— 科技、简洁、杂志、海报质感；动效三层节奏错开：常驻滤镜（呼吸）、事件驱动（觉醒）、全局氛围（颗粒/粒子）。

---

## 1. 整体架构

页面是一个 **分层堆叠结构**，从下到上：

| 层 | 元素 | z-index | 职责 |
|---|---|---|---|
| 场景 | `.glow-floor` / `.ambient` / `.badge` | 5 / 20 / 1 | 地面光晕、全屏漂浮金粒子、工卡本体（DOM） |
| 特效画布 | `<canvas id="fx">` | 25 | 觉醒序列的程序化绘制（辉光/金屑/丝缕），`pointer-events: none` |
| 滤镜 | `<svg>`（隐藏） + `.card` 的 CSS `filter` | — | 热浪折射 + RGB 色散，参数由 JS 每帧驱动 |
| 颗粒 | `#grain` | 28 | 全屏胶片颗粒，`mix-blend-mode: overlay` |
| 暗角 | `.vignette` | 30 | 径向渐变压角 |
| 提示/面板 | `#fx-tip` / `#panel` | 35 / 50 | 操作提示、调参面板 |

关键设计原则：

- **卡片 DOM 完全不动**——特效以 `card.getBoundingClientRect()` 为锚点画在独立 Canvas 上，所以卡片的悬挂摆动、hover 缩放不受影响。
- **表现层与参数层解耦**——所有特效参数收敛进 JS 的 `P` 对象（`DEFAULTS` 快照），面板滑块每帧改 `P`，引擎读 `P`。
- SVG 滤镜做"后处理"：DOM 页面上，位移类效果（热浪）和通道分离（色散）用 SVG filter 是最自然的载体。

---

## 2. 工卡结构（HTML）

```html
<div class="badge">
  <div class="strap"></div>   <!-- 挂绳：斜纹织带 + 竖排 PLAYER·ID·CARD -->
  <div class="clip"></div>    <!-- 金属夹 -->
  <div class="card">
    <div class="barcode"></div>          <!-- 顶部条码纹 -->
    <div class="art"><img src="..."></div> <!-- 角色图 + 底部压暗渐变 -->
    <span class="spark"></span> ×4       <!-- 卡内上飘金色菱形粒子 -->
    <div class="shine"></div>            <!-- 斜向扫光 -->
    <div class="rank"><b>SSS</b><i>RANK</i></div>
    <div class="name">本命钉子户</div>
    <div class="micro">NO.077 · CLASSIFIED · SSS CLEARANCE</div> <!-- 竖排杂志小字 -->
  </div>
</div>
```

---

## 3. 关键样式

### 3.1 工卡入场 + 悬挂摆动

`transform-origin: 50% -8%` 让卡片绕"挂绳顶部"摆，而不是绕自身中心——这是"挂牌"手感的核心。

```css
.badge {
  width: clamp(240px, 30vw, 360px);
  transform-origin: 50% -8%;
  animation: drop-in 1s cubic-bezier(.2,1.1,.4,1) backwards,
             idle-sway 5.5s ease-in-out 1s infinite;
}
@keyframes drop-in {
  from { opacity: 0; transform: translateY(-70px) rotate(-4deg); }
  to   { opacity: 1; transform: translateY(0) rotate(0deg); }
}
@keyframes idle-sway {
  0%, 100% { transform: rotate(1.6deg); }
  50%      { transform: rotate(-1.6deg); }
}
.badge:hover { animation-play-state: paused, paused; transform: rotate(0deg) scale(1.03); }
```

### 3.2 黑卡卡体 + 呼吸金辉

近黑渐变打底，金色只留给边框/文字/光效；`inset` 阴影做内圈金晕，`gold-pulse` 让外发光 2.6s 呼吸。

```css
.card {
  position: relative;
  aspect-ratio: 10 / 15.2;
  border-radius: 24px;
  background: linear-gradient(165deg, #16120a 0%, #0d0b07 55%, #060504 100%);
  border: 3px solid #ffcf3e;
  box-shadow:
    0 0 34px rgba(255,207,62,.5),
    0 0 100px rgba(255,180,30,.25),
    0 24px 60px rgba(0,0,0,.7),
    inset 0 0 26px rgba(255,207,62,.18);
  animation: gold-pulse 2.6s ease-in-out infinite;
  overflow: hidden;
  z-index: 1;
  filter: url(#fx-haze) url(#fx-ca);   /* 常驻 SVG 后处理链，见 §4 */
}
@keyframes gold-pulse {
  0%, 100% { box-shadow: 0 0 34px rgba(255,207,62,.5), 0 0 100px rgba(255,180,30,.25),
             0 24px 60px rgba(0,0,0,.7), inset 0 0 26px rgba(255,207,62,.18); }
  50%      { box-shadow: 0 0 54px rgba(255,207,62,.8), 0 0 160px rgba(255,180,30,.42),
             0 24px 60px rgba(0,0,0,.7), inset 0 0 38px rgba(255,207,62,.3); }
}
```

### 3.3 黑卡质感：科技网格 + 四角括号（海报感）

两个伪元素搞定，不增加任何 DOM：

```css
/* 细网格 + 顶部金色漫射 */
.card::before {
  content: "";
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(0deg,  rgba(255,207,62,.045) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(255,207,62,.045) 0 1px, transparent 1px 24px),
    radial-gradient(120% 80% at 50% 0%, rgba(255,207,62,.1), transparent 55%);
  pointer-events: none;
  z-index: 0;
}
/* 取景框式四角括号：8 条 linear-gradient 定位切角 */
.card::after {
  content: "";
  position: absolute; inset: 3%;
  pointer-events: none;
  background:
    linear-gradient(#ffcf3e,#ffcf3e) left 0 top 0    / 16px 2px,
    linear-gradient(#ffcf3e,#ffcf3e) left 0 top 0    / 2px 16px,
    linear-gradient(#ffcf3e,#ffcf3e) right 0 top 0   / 16px 2px,
    linear-gradient(#ffcf3e,#ffcf3e) right 0 top 0   / 2px 16px,
    linear-gradient(#ffcf3e,#ffcf3e) left 0 bottom 0 / 16px 2px,
    linear-gradient(#ffcf3e,#ffcf3e) left 0 bottom 0 / 2px 16px,
    linear-gradient(#ffcf3e,#ffcf3e) right 0 bottom 0/ 16px 2px,
    linear-gradient(#ffcf3e,#ffcf3e) right 0 bottom 0/ 2px 16px;
  background-repeat: no-repeat;
  opacity: .75;
}
```

### 3.4 扫光与卡内粒子

```css
/* 斜向扫光：translateX 循环，screen 混合 */
.shine {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.10) 45%,
              rgba(255,255,255,.22) 50%, rgba(255,255,255,.10) 55%, transparent 70%);
  transform: translateX(-120%);
  animation: sweep 5s ease-in-out infinite;
  pointer-events: none;
  mix-blend-mode: screen;
}
@keyframes sweep {
  0%, 55%   { transform: translateX(-120%); }
  80%, 100% { transform: translateX(120%); }
}

/* 金色菱形粒子：clip-path 画菱形 + drop-shadow 辉光 */
.spark {
  position: absolute;
  width: 7px; height: 7px;
  background: #ffcf3e;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  opacity: 0;
  filter: drop-shadow(0 0 5px rgba(255,207,62,.9));
  animation: float-spark 2.8s ease-in-out infinite;
}
@keyframes float-spark {
  0%   { transform: translateY(10px); opacity: 0; }
  25%  { opacity: 1; }
  100% { transform: translateY(-60px) rotate(180deg); opacity: 0; }
}
/* 4 颗粒子用 nth-of-type 错开位置/尺寸/延迟 */
```

### 3.5 RANK 徽标与杂志小字

```css
.rank b {
  font-size: clamp(24px, 3.2vw, 42px);
  font-style: italic; font-weight: 900; letter-spacing: 3px;
  color: #ffcf3e;
  text-shadow: 0 0 18px rgba(255,207,62,.95), 0 3px 0 #7a5200; /* 辉光 + 硬投影双色 */
}
.micro {
  position: absolute; right: 3.2%; top: 15%;
  writing-mode: vertical-rl;      /* 竖排，杂志侧边刊号语言 */
  font-size: 9px; letter-spacing: 3px;
  color: rgba(255,207,62,.38);
}
```

---

## 4. SVG 后处理滤镜（核心）

两个滤镜通过 CSS 常驻在卡体上：`filter: url(#fx-haze) url(#fx-ca)`，参数由 JS 每帧改 attribute。

### 4.1 热浪 · 径向扩散（fx-haze）

不用均匀湍流，而是构造一个**"位移随离心距线性增大"**的向量场：中心位移为 0，越靠边推得越远 → 观感是内容"从中心向四周扩散"。

- `feImage` 两条 data-uri 线性渐变：R 通道 = 横向梯度（黑→红），G 通道 = 纵向梯度（黑→绿）
- `feComposite arithmetic k2=1 k3=1` 把两张图相加成位移映射
- `feDisplacementMap` 用它位移源图形（边缘位移 ≈ scale/2 px）
- 再叠一层小尺度 `feTurbulence`（baseFrequency 0.55 0.75, scale 1.4）给扩散加波纹

```html
<filter id="fx-haze" x="-30%" y="-30%" width="160%" height="160%">
  <feImage href="data:image/svg+xml,%3Csvg ...线性渐变 黑→rgb(255,0,0)...%3E" result="gx"/>
  <feImage href="data:image/svg+xml,%3Csvg ...线性渐变 黑→rgb(0,255,0)...%3E" result="gy"/>
  <feComposite in="gx" in2="gy" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="map"/>
  <feDisplacementMap id="haze-disp" in="SourceGraphic" in2="map" scale="3.5"
                     xChannelSelector="R" yChannelSelector="G" result="d1"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.55 0.75" numOctaves="1" seed="4" result="n"/>
  <feDisplacementMap in="d1" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
</filter>
```

### 4.2 RGB 色散（fx-ca）

真·通道分离：三个 `feColorMatrix` 分别抽出 R/G/B，R、B 反向水平偏移，再 `screen` 混合回去。边缘出现红蓝重影，距离由 `feOffset` 的 `dx` 控制。

```html
<filter id="fx-ca" x="-30%" y="-30%" width="160%" height="160%">
  <feColorMatrix in="SourceGraphic" type="matrix"
    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
  <feOffset id="ca-r" in="r" dx="-1.2" dy="0" result="ro"/>
  <feColorMatrix in="SourceGraphic" type="matrix"
    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gr"/>
  <feColorMatrix in="SourceGraphic" type="matrix"
    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
  <feOffset id="ca-b" in="b" dx="1.2" dy="0" result="bo"/>
  <feBlend in="ro" in2="gr" mode="screen" result="rg"/>
  <feBlend in="rg" in2="bo" mode="screen"/>
</filter>
```

### 4.3 ⚠️ 关键坑：keyframes 里必须重复滤镜前缀

CSS `filter` 是整体覆盖属性。glitch/charge 的 keyframes 里如果只写 `brightness(...)`，会把 `url(#fx-haze) url(#fx-ca)` 整个冲掉，热浪和色散会在动画帧瞬间消失。所以**每一帧都要重复完整前缀**：

```css
@keyframes card-glitch {
  0% {
    /* ✅ 对：滤镜链写全 */                        /* ❌ 错：filter: brightness(1.6) */
    filter: url(#fx-haze) url(#fx-ca) brightness(1.6) contrast(1.2);
    ...
  }
}
```

---

## 5. 撕裂（glitch）实现

窄条切片方案：`clip-path` 多边形让卡面只有一条 6~8% 宽的横缝发生错位跳动，配合小幅位移和色散阴影。刻意**克制幅度**（早期版本撕掉半个画面，观感差，已回调）。

```css
.card.glitch { animation: card-glitch .32s steps(1, end) 1; }
@keyframes card-glitch {
  0% {
    filter: url(#fx-haze) url(#fx-ca) brightness(1.6) contrast(1.2);
    transform: translate(-2px, 1px) skewX(-.5deg);
    /* 40% 处一条 1% 宽的错位缝 */
    clip-path: polygon(0 0, 100% 0, 100% 40%, 0 39%, 0 46%, 100% 45%, 100% 100%, 0 100%);
    box-shadow: -3px 0 rgba(255,90,90,.5), 3px 0 rgba(90,180,255,.5),
                0 0 70px rgba(255,207,62,.95), 0 24px 60px rgba(0,0,0,.7);
  }
  30% { /* 缝移到 ~18-20% 处，位移反向 */ ... }
  60% { /* 缝移到 ~55% 处，亮度峰值 1.7 */ ... }
  100% { filter: url(#fx-haze) url(#fx-ca); transform: none; clip-path: none; }
}
/* 空闲微撕裂：同结构 0.12s 一闪而过 */
.card.mglitch { animation: card-mglitch .12s steps(1, end) 1; }
```

要点：

- `steps(1, end)` 让帧与帧之间**硬切**，才有数字撕裂感（ease 会糊掉）
- 三帧的缝位置各不相同（40% → 20% → 55%），观感是"细缝在闪"而非"半图在闪"
- 红蓝两个 `box-shadow` 偏移模拟色散重影

---

## 6. 胶片颗粒

全屏固定层：内联 SVG `feTurbulence` 噪声做贴图，`overlay` 混合，`steps(5)` 随机跳变位置（颗粒"活"的关键——不能让它静止，静止就变成一张脏贴图）。

```css
#grain {
  position: fixed; inset: -120px;      /* 四周留出位移余量，跳变时不露边 */
  pointer-events: none; z-index: 28;
  opacity: .1;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='260' height='260' filter='url(%23n)'/></svg>");
  animation: grain-jump .42s steps(5) infinite;
}
@keyframes grain-jump {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-38px, 22px); }
  40%  { transform: translate(24px, -30px); }
  60%  { transform: translate(-20px, -42px); }
  80%  { transform: translate(36px, 18px); }
  100% { transform: translate(0, 0); }
}
```

---

## 7. 觉醒特效引擎（Canvas 2D）

### 7.1 序列时序

```
seqT: -1 (空闲) → 0 … strike(0.42s) 蓄能 → strike 时刻引爆 → … end(1.9s) 结束回到空闲
```

| 阶段 | 时间 | 行为 |
|---|---|---|
| 蓄能 | 0 → 0.42s | `.card.charge`（亮度/饱和爬升）；每帧 3 颗金色微粒从外围向卡片中心汇聚（半径随进度收缩 85%） |
| 引爆 | t = 0.42s | 撤 charge、加 glitch（CSS 撕裂）；一次性生成 `P.emberN` 颗金屑粒子（随机方向速度 60~320） |
| 迸发 | 0.42 → 1.9s | 中心径向辉光（快起 0.08s、慢落包络）+ 5~14 条二次曲线折射丝缕（`lighter` 加法混合）+ 金屑阻尼上飘 |
| 空闲 | — | 每 2.5~5.5s 一次微撕裂；每 6.5~10.5s 自动觉醒（可关） |

核心驱动代码（节选）：

```js
const surge = seqT >= 0
  ? (seqT < P.strike ? (seqT / P.strike) * .45                     // 蓄能：缓升到 0.45
                     : Math.max(0, 1 - (seqT - P.strike) / (P.end - P.strike))) // 引爆后：1→0 衰减
  : 0;
const pulse = 1 + Math.sin(tsec * 2.8) * .35;   // 慢呼吸：波从中心向外推的节奏感
disp.setAttribute("scale", ((P.hazeBase + surge * P.hazeSurge) * pulse).toFixed(2));
const cdx = P.caBase + surge * P.caSurge;
caR.setAttribute("dx", (-cdx).toFixed(2));       // R 通道向左
caB.setAttribute("dx", cdx.toFixed(2));          // B 通道向右
```

金屑粒子（阻尼 + 上飘）：

```js
e.x += e.vx * dt; e.y += e.vy * dt;
e.vx *= .985; e.vy = e.vy * .985 - 26 * dt;   // 速度衰减 + 恒定向上加速度
```

重启 CSS 动画的标准技巧（移除类后强制重排再加回）：

```js
card.classList.remove("mglitch");
void card.offsetWidth;          // 强制 reflow，让 animation 重新触发
card.classList.add("mglitch");
```

### 7.2 参数表（面板实时驱动）

| 参数 | 默认 | 说明 |
|---|---|---|
| `hazeBase` / `hazeSurge` | 3.5 / 14 | 热浪径向基础强度 / 觉醒时增幅 |
| `caBase` / `caSurge` | 1.1 / 5.2 | 色散基础位移(px) / 觉醒增幅 |
| `grain` | 0.1 | 颗粒层透明度（0 = 关） |
| `emberN` | 26 | 金屑数量 |
| `strike` / `end` | 0.42 / 1.9 | 蓄能时长 / 觉醒总时长(s) |
| `autoBurst` / `gapMin` / `gapMax` | true / 6.5 / 10.5 | 自动觉醒开关与间隔(s)，带 min≤max 联动 |
| `mglGap` | 3.5 | 空闲微撕裂平均间隔(s)，实际取 0.7~1.4 倍随机 |

---

## 8. 调参面板

零依赖实现（无任何 UI 库）：`PANEL_SCHEMA` 数组描述分组与滑块（`details/summary` 折叠 + 原生 `input[type=range]`），`buildPanel()` 按 schema 生成 DOM，input 事件写回 `P` 对象并 `syncPanel()` 同步数值显示。

- 开关：**H 键** / 右上角 ⚙ / 面板 ✕；底部 **⚡觉醒**（手动触发）与 **↺重置**（恢复 DEFAULTS）
- 滑块自定义外观：`-webkit-appearance: none` + 伪元素轨道/圆钮，暗金主题
- 面板结构改参数只需改 `PANEL_SCHEMA`，引擎零改动

---

## 9. 集成入口（接游戏逻辑）

```js
awaken();   // 觉醒序列唯一入口；出金抽卡时调用即可
```

- `P` 对象是运行时参数总线，可在游戏代码里按稀有度动态改（如 SSR 时 `P.hazeSurge = 20`）
- 特效以 `getBoundingClientRect()` 为锚点，卡片数量/位置变化无需改引擎
- 页面中 `data-page-node-id` 属性是外部设计工具的节点元数据，浏览器不消费，可保留

---

## 10. 已知经验与注意事项

1. **keyframes 覆盖 filter**：任何对 `.card` 加 `filter` 的规则/动画帧都必须带上 `url(#fx-haze) url(#fx-ca)` 前缀（见 §4.3）。
2. **rAF 参数陷阱**：`requestAnimationFrame(draw)` 会把时间戳作为第一个参数传入，draw 里要自己算 `dt`，不要直接把时间戳当 delta 用。
3. **删除中间变量要查引用**：曾因重构删掉 `wob` 但色散行残留引用，导致每帧 `ReferenceError`、整个动画循环静默中断——rAF 循环里的异常不会打断页面其他脚本，非常隐蔽。
4. **`inset: -120px` 的颗粒层**：给 `grain-jump` 的位移留余量，否则跳变时边缘露底。
5. **撕裂幅度要克制**：切片缝宽 6~8%、位移 ±2px 是当前调校的平衡点，过大会"半图在闪"。
