import React, { useEffect, useMemo, useState } from "react";

// 单文件 React 组件（Tailwind 已可用）
// 默认导出组件：LifePathWizard

const VALUE_WORDS = [
  "自由","成长","影响","稳定","好奇","审美","创造","贡献","专业","诚信",
  "学习","健康","家庭","朋友","效率","秩序","探索","冒险","服务","领导",
  "独立","合作","成就","安全","尊重","公平","乐趣","意义","财富","平衡"
];

const initialData = {
  // A. 价值观
  a1_satisfy_1: "",
  a1_satisfy_2: "",
  a1_satisfy_3: "",
  a1_low_1: "",
  a1_low_2: "",
  a1_low_3: "",
  selected_values: [],
  a3_choices: {},
  bottom_lines: "",
  no_do_list: "",
  a5_scores: {},

  // B. 天赋
  b1_fast_1: "",
  b1_fast_2: "",
  b1_fast_3: "",
  b2_flow_1: "",
  b2_flow_2: "",
  b2_flow_3: "",
  b3_help_list: "",
  b4_optimize_tendencies: "",
  b5_plus_energy: "",
  b5_minus_energy: "",
  b6_fail_1: "",
  b6_fail_2: "",
  b6_fail_3: "",
  b7_asset_1: "",
  b7_asset_2: "",
  b7_asset_3: "",

  // C. 梦想/愿景
  c1_ideal_day: "",
  c2_target_group: "",
  c2_pain_points: "",
  c3_returns: {},
  c4_not_want: "",
  c5_one_year: "",
  c6_fears: "",

  // D. 交集
  direction_variants: [],
  chosen_direction_index: 0,
  d2_directions: [],
  matrix_scores: [],

  // E. 实验
  experiments: []
};

const steps = [
  { id: "A1", title: "A1 高光/低谷（价值观）" },
  { id: "A2", title: "A2 价值词选择" },
  { id: "A3", title: "A3 取舍小测" },
  { id: "A4", title: "A4 底线与不做清单" },
  { id: "A5", title: "A5 当下匹配度" },

  { id: "B1", title: "B1 学得快的事（天赋）" },
  { id: "B2", title: "B2 心流时刻" },
  { id: "B3", title: "B3 他人求助清单" },
  { id: "B4", title: "B4 自然的优化倾向" },
  { id: "B5", title: "B5 能量清单" },
  { id: "B6", title: "B6 反证" },
  { id: "B7", title: "B7 可迁移资产" },

  { id: "C1", title: "C1 三年后的理想日常（梦想/愿景）" },
  { id: "C2", title: "C2 服务对象与问题" },
  { id: "C3", title: "C3 回报与约束" },
  { id: "C4", title: "C4 不想要的生活" },
  { id: "C5", title: "C5 一年生命假设" },
  { id: "C6", title: "C6 恐惧设定" },

  { id: "D1", title: "D1 方向句 & 候选" },
  { id: "D2", title: "D2 五个方向候选" },
  { id: "D3", title: "D3 打分决策矩阵" },

  { id: "E1", title: "E1 两周小实验卡" },
  { id: "E2", title: "E2 每周复盘" },

  { id: "RESULT", title: "结果与导出" }
];

export default function LifePathWizard() {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem("lifepath_data_v1");
      return raw ? JSON.parse(raw) : initialData;
    } catch (e) {
      return initialData;
    }
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [savedAt, setSavedAt] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    localStorage.setItem("lifepath_data_v1", JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const t = localStorage.getItem("lifepath_saved_at");
    if (t) setSavedAt(t);
  }, []);

  const saveNow = () => {
    localStorage.setItem("lifepath_data_v1", JSON.stringify(data));
    const now = new Date().toLocaleString();
    localStorage.setItem("lifepath_saved_at", now);
    setSavedAt(now);
  };

  const next = () => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else setStepIndex(steps.length - 1);
  };
  const prev = () => setStepIndex(Math.max(0, stepIndex - 1));

  const setField = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  // 分析函数：提炼价值词、天赋关键词、自动生成方向句
  const runAnalysis = () => {
    // 合并文本块
    const textPool = [
      data.a1_satisfy_1, data.a1_satisfy_2, data.a1_satisfy_3,
      data.a1_low_1, data.a1_low_2, data.a1_low_3,
      data.b1_fast_1, data.b1_fast_2, data.b1_fast_3,
      data.b2_flow_1, data.b2_flow_2, data.b2_flow_3,
      data.b3_help_list, data.b4_optimize_tendencies, data.b7_asset_1, data.b7_asset_2, data.b7_asset_3,
      data.c1_ideal_day, data.c2_target_group, data.c2_pain_points
    ].filter(Boolean).join(" \n ");

    // 统计价值词匹配
    const valueScores = VALUE_WORDS.map(w => ({ w, score: (textPool.match(new RegExp(w, "g")) || []).length })).sort((a,b)=>b.score-a.score);

    // 如果用户手动选择了价值词，把它们放前面
    const manual = Array.isArray(data.selected_values) ? data.selected_values : [];
    const combinedValues = [...new Set([...manual, ...valueScores.filter(v=>v.score>0).map(v=>v.w)])];

    // 提取天赋关键词（从B区域文本里分词取高频）——使用简单分割
    const bpool = [data.b1_fast_1, data.b1_fast_2, data.b1_fast_3, data.b2_flow_1, data.b2_flow_2, data.b2_flow_3, data.b7_asset_1, data.b7_asset_2, data.b7_asset_3].filter(Boolean).join(" , ");
    const tokens = bpool.replace(/[，。,\.\n\r]/g, " ").split(/\s+/).filter(t=>t.length>=2);
    const freq = {};
    tokens.forEach(t=>{ freq[t] = (freq[t]||0)+1; });
    const skillPairs = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);

    // 生成方向句模版
    const targetGroup = data.c2_target_group || "某一群体/行业";
    const pain = data.c2_pain_points || "具体痛点/问题";
    const topSkills = skillPairs.slice(0,3);
    const topValues = combinedValues.slice(0,3);

    const makeDir = (i) => {
      if (i===0) return `我想用【${topSkills[0]||'我的能力'}】和【${topSkills[1]||'系统化方法'}】在【${targetGroup}】解决【${pain}】，因为我重视【${topValues.join('、')||'成长、影响'}】，目标是实现可持续的影响与可见成果。`;
      if (i===1) return `基于我的【${topSkills[0]||'经验'}】和对【${topValues[0]||'自由'}】的追求，我愿意在【${targetGroup}】通过【小规模实验/试点】验证解决【${pain}】的路径，并优先保证时间与学习的平衡。`;
      return `用我的【${topSkills.slice(0,2).join('/')||'擅长技能'}】聚焦在【${targetGroup}】的【${pain}】，先做一个两周小实验（最小可验证成果：X），如果验证成功就扩大化。`;
    };

    const variants = [0,1,2].map(i=>makeDir(i));

    // 默认生成一个两周实验模板
    const experimentTemplate = {
      title: `两周小实验：验证方向「${variants[0].slice(0,40)}...」`,
      goal: `验证是否能在14天内拿到至少 3 次来自目标用户的直接反馈或 100 次阅读/曝光。`,
      steps: [
        "第1-3天：明确最小可验证假设（MVP）并做出样品或文案。",
        "第4-9天：将样品/文案投放给目标人群（社群、朋友圈、小范围广告、信任联系人等），收集定性反馈。",
        "第10-14天：整理反馈，量化结果（阅读数/人次/反馈次数），决定放大/迭代/放弃。"
      ],
      metrics: { targetFeedback: 3, targetReads: 100 }
    };

    const out = { valueScores, combinedValues, skillPairs, variants, experimentTemplate };
    setAnalysis(out);
    // 填入 data 的 direction_variants
    setData(prev => ({ ...prev, direction_variants: variants }));
    return out;
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ data, analysis }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifepath-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (!confirm("确定清空本地所有填写数据吗？（此操作不可恢复）")) return;
    localStorage.removeItem("lifepath_data_v1");
    localStorage.removeItem("lifepath_saved_at");
    setData(JSON.parse(JSON.stringify(initialData)));
    setStepIndex(0);
    setSavedAt(null);
    setAnalysis(null);
  };

  // UI helpers
  const toggleValueChip = (w) => {
    const s = data.selected_values || [];
    if (s.includes(w)) setField("selected_values", s.filter(x=>x!==w));
    else setField("selected_values", [...s, w].slice(0,7));
  };

  const generateDirectionCandidates = () => {
    // use analysis if exists
    const an = analysis || runAnalysis();
    setData(prev => ({ ...prev, d2_directions: an.variants }));
  };

  const computeMatrix = () => {
    // expect data.d2_directions length <=5
    const dirs = data.d2_directions && data.d2_directions.length>0 ? data.d2_directions : (data.direction_variants || []);
    const scores = dirs.map((dir, idx) => {
      const key = `matrix_${idx}`;
      const m = data.matrix_scores && data.matrix_scores[idx] ? data.matrix_scores[idx] : { value:3, skill:3, energy:3, opp:3 };
      const total = m.value*0.35 + m.skill*0.30 + m.energy*0.20 + m.opp*0.15;
      return { dir, m, total };
    }).sort((a,b)=>b.total-a.total);
    setData(prev => ({ ...prev, matrix_scores: scores }));
  };

  // Render helpers
  const StepNav = () => (
    <div className="w-56 p-4 sticky top-4 h-[80vh] overflow-auto rounded-2xl bg-white/60 backdrop-blur border">
      <h3 className="text-lg font-semibold mb-3">流程导航</h3>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.id} className={`p-2 rounded-lg cursor-pointer ${i===stepIndex? 'bg-indigo-50 border border-indigo-100':'hover:bg-gray-50'}`} onClick={()=>setStepIndex(i)}>
            <div className="text-sm font-medium">{s.title}</div>
            <div className="text-xs text-gray-500">步骤 {i+1} / {steps.length}</div>
          </li>
        ))}
      </ol>
      <div className="mt-4 text-xs text-gray-600">已保存：{savedAt || '未保存'}</div>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 rounded bg-indigo-600 text-white text-sm" onClick={saveNow}>保存</button>
        <button className="px-3 py-1 rounded border text-sm" onClick={clearAll}>清空</button>
      </div>
      <div className="mt-4 text-xs text-gray-500">提示：每步建议不超过30分钟，先写再优化。</div>
    </div>
  );

  const FieldText = ({ label, valueKey, placeholder, rows=4 }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea rows={rows} value={data[valueKey]||''} onChange={e=>setField(valueKey, e.target.value)} placeholder={placeholder} className="w-full p-3 border rounded-lg text-sm" />
    </div>
  );

  const StepContent = () => {
    const s = steps[stepIndex];
    if (!s) return null;

    switch (s.id) {
      case 'A1':
        return (
          <div>
            <h2 className="text-xl font-semibold">A1 · 高光 / 低谷（帮助你提炼价值观）</h2>
            <p className="text-sm text-gray-600 mt-2">请尽量写具体情境（谁、时间、你做了什么、别人怎么说、结果）</p>
            <FieldText label="过去2年最满足的瞬间 1" valueKey="a1_satisfy_1" placeholder="例：在项目X中负责Y，我通过...，结果是..."/>
            <FieldText label="过去2年最满足的瞬间 2" valueKey="a1_satisfy_2"/>
            <FieldText label="过去2年最满足的瞬间 3" valueKey="a1_satisfy_3"/>
            <hr className="my-4" />
            <FieldText label="过去2年最沮丧/愤怒的瞬间 1" valueKey="a1_low_1" placeholder="写出触发你情绪的具体事件、你当时在意什么"/>
            <FieldText label="过去2年最沮丧/愤怒的瞬间 2" valueKey="a1_low_2"/>
            <FieldText label="过去2年最沮丧/愤怒的瞬间 3" valueKey="a1_low_3"/>
            <div className="text-sm text-gray-500 mt-2">完成后下一步会帮助你把这些内容提炼成价值词。</div>
          </div>
        );

      case 'A2':
        return (
          <div>
            <h2 className="text-xl font-semibold">A2 · 选择你的价值词（最多7个）</h2>
            <p className="text-sm text-gray-600 mt-2">点击下方标签选择。你也可以在输入框补充自定义词。</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {VALUE_WORDS.map(w => (
                <button key={w} onClick={()=>toggleValueChip(w)} className={`px-2 py-1 rounded ${data.selected_values && data.selected_values.includes(w) ? 'bg-indigo-600 text-white':'bg-gray-100 text-gray-800'}`}>
                  {w}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-sm block mb-1">自定义（逗号分隔，选填）</label>
              <input className="w-full p-2 border rounded" value={(data.selected_values || []).filter(x=>!VALUE_WORDS.includes(x)).join(',')} onChange={e=>setField('selected_values', [...(data.selected_values || []).filter(x=>VALUE_WORDS.includes(x)), ...e.target.value.split(',').map(s=>s.trim()).filter(Boolean)].slice(0,7))} placeholder="例如：成就, 柔软" />
              <div className="text-xs text-gray-500 mt-2">已选：{(data.selected_values||[]).join('、') || '——'}</div>
            </div>
          </div>
        );

      case 'A3':
        return (
          <div>
            <h2 className="text-xl font-semibold">A3 · 取舍小测（直觉作答）</h2>
            <p className="text-sm text-gray-600">请选择更接近你的直觉，并写一句简单的原因。</p>
            {[
              ['自由','稳定'],
              ['成长','舒适'],
              ['影响力','隐私'],
              ['收入上限','时间自由'],
              ['团队归属','独立决策']
            ].map((pair, idx)=>{
              const key = `a3_choice_${idx}`;
              return (
                <div key={key} className="mb-3 border p-3 rounded">
                  <div className="flex gap-2 mb-2">
                    <button onClick={()=>setField('a3_choices', {...(data.a3_choices||{}), [key]: pair[0]})} className={`px-3 py-1 rounded ${data.a3_choices && data.a3_choices[key]===pair[0] ? 'bg-indigo-600 text-white':'bg-gray-100'}`}>{pair[0]}</button>
                    <button onClick={()=>setField('a3_choices', {...(data.a3_choices||{}), [key]: pair[1]})} className={`px-3 py-1 rounded ${data.a3_choices && data.a3_choices[key]===pair[1] ? 'bg-indigo-600 text-white':'bg-gray-100'}`}>{pair[1]}</button>
                  </div>
                  <input className="w-full p-2 border rounded text-sm" placeholder="一句话说明你的直觉原因（例如：我不喜欢被束缚）" value={(data.a3_choices && data.a3_choices[key+'_reason'])||''} onChange={e=>setField('a3_choices', {...(data.a3_choices||{}), [key+'_reason']: e.target.value})} />
                </div>
              );
            })}
          </div>
        );

      case 'A4':
        return (
          <div>
            <h2 className="text-xl font-semibold">A4 · 底线与不做清单</h2>
            <FieldText label="你绝不妥协的 3 条底线（逗号分隔）" valueKey="bottom_lines" placeholder="例如：不违背诚信、不长期加班、不能伤害家庭时间" rows={2} />
            <FieldText label="明确不做的 3 类工作/环境" valueKey="no_do_list" placeholder="例如：高频应酬、冷电话销售、长期出差" rows={2} />
          </div>
        );

      case 'A5':
        return (
          <div>
            <h2 className="text-xl font-semibold">A5 · 当下匹配度打分（1-5）</h2>
            <p className="text-sm text-gray-600">请对你当前学习/工作与你选的 TOP3 价值词的匹配度打分（1=完全不符合 5=非常符合）</p>
            {(data.selected_values||[]).slice(0,3).map((v,i)=> (
              <div key={v} className="my-3">
                <div className="text-sm font-medium">{v}</div>
                <input type="range" min="1" max="5" value={(data.a5_scores && data.a5_scores[v])||3} onChange={e=>setField('a5_scores', {...(data.a5_scores||{}), [v]: Number(e.target.value)})} />
                <div className="text-xs text-gray-500">当前分数：{(data.a5_scores && data.a5_scores[v])||3}</div>
              </div>
            ))}
            <div className="text-xs text-gray-500">如果还没选价值词，请回到上一步选择。</div>
          </div>
        );

      case 'B1':
        return (
          <div>
            <h2 className="text-xl font-semibold">B1 · 学得快的事（写证据）</h2>
            <FieldText label="你上手/进步最快的事 1（举证据/结果）" valueKey="b1_fast_1"/>
            <FieldText label="上手快的事 2" valueKey="b1_fast_2"/>
            <FieldText label="上手快的事 3" valueKey="b1_fast_3"/>
          </div>
        );

      case 'B2':
        return (
          <div>
            <h2 className="text-xl font-semibold">B2 · 心流时刻（忘记时间的活动）</h2>
            <FieldText label="心流时刻 1（具体：在做什么、与谁、持续多久、产出）" valueKey="b2_flow_1"/>
            <FieldText label="心流时刻 2" valueKey="b2_flow_2"/>
            <FieldText label="心流时刻 3" valueKey="b2_flow_3"/>
          </div>
        );

      case 'B3':
        return (
          <div>
            <h2 className="text-xl font-semibold">B3 · 他人求助清单</h2>
            <FieldText label="别人经常找你帮什么？（举例/为什么找你）" valueKey="b3_help_list"/>
          </div>
        );

      case 'B4':
        return (
          <div>
            <h2 className="text-xl font-semibold">B4 · 自然的优化倾向</h2>
            <FieldText label="你下意识常做的改进或优化行为（举例）" valueKey="b4_optimize_tendencies"/>
          </div>
        );

      case 'B5':
        return (
          <div>
            <h2 className="text-xl font-semibold">B5 · 能量清单</h2>
            <FieldText label="让你 + 能量 的活动（5项）" valueKey="b5_plus_energy"/>
            <FieldText label="让你 - 能量 的活动（5项）" valueKey="b5_minus_energy"/>
          </div>
        );

      case 'B6':
        return (
          <div>
            <h2 className="text-xl font-semibold">B6 · 反证（难以做好的事）</h2>
            <FieldText label="投入很多也难以做好 1（如何规避/外包）" valueKey="b6_fail_1"/>
            <FieldText label="难以做好 2" valueKey="b6_fail_2"/>
            <FieldText label="难以做好 3" valueKey="b6_fail_3"/>
          </div>
        );

      case 'B7':
        return (
          <div>
            <h2 className="text-xl font-semibold">B7 · 可迁移资产（你的输出/作品）</h2>
            <FieldText label="可复用的能力/作品 1（附成果/数据或链接）" valueKey="b7_asset_1"/>
            <FieldText label="可复用的能力/作品 2" valueKey="b7_asset_2"/>
            <FieldText label="可复用的能力/作品 3" valueKey="b7_asset_3"/>
          </div>
        );

      case 'C1':
        return (
          <div>
            <h2 className="text-xl font-semibold">C1 · 三年后的一天（理想）</h2>
            <p className="text-sm text-gray-600">写下从早到晚的具体日常：地点、节奏、主要活动、与谁在一起、收入来源等。</p>
            <FieldText label="理想的一天（从起床到入睡）" valueKey="c1_ideal_day" rows={6} />
          </div>
        );

      case 'C2':
        return (
          <div>
            <h2 className="text-xl font-semibold">C2 · 服务对象与问题</h2>
            <FieldText label="你最想帮助的群体（具体）" valueKey="c2_target_group"/>
            <FieldText label="这些人最痛的具体问题是什么？" valueKey="c2_pain_points"/>
          </div>
        );

      case 'C3':
        return (
          <div>
            <h2 className="text-xl font-semibold">C3 · 回报与约束（先标重要性）</h2>
            <p className="text-sm text-gray-600">对以下维度用 1-5 打分并写一句说明：收入、时间自由、地理自由、学习曲线、社会影响、审美/作品感、稳定性</p>
            {['收入目标','时间自由','地理自由','学习曲线','社会影响','审美/作品感','稳定性'].map(k=> (
              <div key={k} className="my-2">
                <div className="text-sm">{k}</div>
                <input type="range" min="1" max="5" value={(data.c3_returns && data.c3_returns[k])||3} onChange={e=>setField('c3_returns', {...(data.c3_returns||{}), [k]: Number(e.target.value)})} />
                <div className="text-xs text-gray-500">当前：{(data.c3_returns && data.c3_returns[k])||3}</div>
              </div>
            ))}
          </div>
        );

      case 'C4':
        return (
          <div>
            <h2 className="text-xl font-semibold">C4 · 不想要的生活</h2>
            <FieldText label="你不能接受的 3 个状态（以及避免方案）" valueKey="c4_not_want" rows={3} />
          </div>
        );

      case 'C5':
        return (
          <div>
            <h2 className="text-xl font-semibold">C5 · 一年生命假设</h2>
            <FieldText label="如果只剩1年，你会立刻做的 3 件事（为什么没开始）" valueKey="c5_one_year"/>
          </div>
        );

      case 'C6':
        return (
          <div>
            <h2 className="text-xl font-semibold">C6 · 恐惧设定</h2>
            <FieldText label="追求理想最糟会发生什么？（概率/预防/修复）" valueKey="c6_fears" rows={4} />
          </div>
        );

      case 'D1':
        return (
          <div>
            <h2 className="text-xl font-semibold">D1 · 方向句（我想用...）</h2>
            <p className="text-sm text-gray-600">点击「自动生成」从你已填写的内容中提炼候选句，或手动写 3-5 个版本。</p>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={()=>runAnalysis()}>自动生成候选</button>
              <button className="px-3 py-1 rounded border" onClick={()=>generateDirectionCandidates()}>填入候选</button>
            </div>
            <div className="mt-4">
              {(data.direction_variants||[]).map((v, i)=> (
                <div key={i} className="p-3 rounded border mb-2 bg-gray-50">
                  <div className="text-sm">候选 {i+1}</div>
                  <textarea className="w-full p-2 mt-1 rounded" rows={2} value={v} onChange={e=>setData(prev=>({...prev, direction_variants: prev.direction_variants.map((x,j)=> j===i?e.target.value:x)}))} />
                </div>
              ))}
              <div className="mt-2 text-xs text-gray-500">你也可以手动写 3-5 个方向句。</div>
              <div className="mt-2">
                <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={()=>setField('direction_variants', [...(data.direction_variants||[]), ''].slice(0,5))}>新增空候选</button>
              </div>
            </div>
          </div>
        );

      case 'D2':
        return (
          <div>
            <h2 className="text-xl font-semibold">D2 · 五个方向候选（把方向变成可执行的赛道）</h2>
            <p className="text-sm text-gray-600">为每个候选方向写一句电梯陈述 + 一个可验证最小成果（MVP）。</p>
            {(data.direction_variants||[]).slice(0,5).map((v,i)=> (
              <div key={i} className="border rounded p-3 mb-3">
                <div className="text-sm font-medium">方向 {i+1}</div>
                <textarea rows={2} className="w-full p-2 mt-1 rounded" value={v} onChange={e=>setData(prev=>({...prev, direction_variants: prev.direction_variants.map((x,j)=> j===i?e.target.value:x)}))} />
                <input className="w-full p-2 mt-2 border rounded" placeholder="一句话电梯陈述" value={(data.d2_directions && data.d2_directions[i])||''} onChange={e=>setData(prev=>({...prev, d2_directions: [...(prev.d2_directions||[]).slice(0,i), e.target.value, ...(prev.d2_directions||[]).slice(i+1)] }))} />
                <input className="w-full p-2 mt-2 border rounded" placeholder="最小可验证成果（MVP）例如：1篇文章/1个样品/首单等" value={(data.experiments && data.experiments[i] && data.experiments[i].goal) || ''} onChange={e=>setData(prev=>({...prev, experiments: [...(prev.experiments||[]).slice(0,i), { ...(prev.experiments||[])[i], goal: e.target.value }, ...(prev.experiments||[]).slice(i+1)] }))} />
              </div>
            ))}
            <div className="text-xs text-gray-500">电梯陈述与 MVP 会用于后面的打分与实验卡。</div>
          </div>
        );

      case 'D3':
        return (
          <div>
            <h2 className="text-xl font-semibold">D3 · 打分决策矩阵</h2>
            <p className="text-sm text-gray-600">请对每个方向按四个维度打分（1-5）。系统会用权重计算加权总分，帮助你选出 TOP2。</p>
            {(data.d2_directions && data.d2_directions.length>0 ? data.d2_directions : data.direction_variants || []).map((dir,i)=> (
              <div key={i} className="border rounded p-3 mb-3">
                <div className="text-sm font-medium">方向 {i+1}: {dir.slice(0,80)}</div>
                {['value','skill','energy','opp'].map(k=> (
                  <div key={k} className="mt-2">
                    <div className="text-xs text-gray-600">{k==='value'?'价值观吻合':k==='skill'?'天赋使用度':k==='energy'?'个人能量':'机会与资源'}</div>
                    <input type="range" min="1" max="5" value={(data.matrix_scores && data.matrix_scores[i] && data.matrix_scores[i].m && data.matrix_scores[i].m[k]) || 3} onChange={e=>{
                      const copy = data.matrix_scores ? [...data.matrix_scores] : [];
                      copy[i] = copy[i] || { dir, m: { value:3, skill:3, energy:3, opp:3 }, total:0 };
                      copy[i].m[k] = Number(e.target.value);
                      setData(prev=>({...prev, matrix_scores: copy}));
                    }} />
                  </div>
                ))}
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={computeMatrix}>计算加权总分</button>
            </div>
            <div className="mt-3">
              {data.matrix_scores && data.matrix_scores.length>0 && (
                <div>
                  <div className="text-sm font-medium">排序结果（加权总分）</div>
                  <ol className="list-decimal ml-6 mt-2">
                    {data.matrix_scores.sort((a,b)=>b.total-a.total).map((r,i)=> (
                      <li key={i} className="mb-1">{r.dir.slice(0,120)} — 分数：{r.total.toFixed(2)}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        );

      case 'E1':
        return (
          <div>
            <h2 className="text-xl font-semibold">E1 · 两周小实验卡（为TOP方向准备）</h2>
            <p className="text-sm text-gray-600">请为你选择的方向写一张两周实验卡：目标、最小行动、指标、资源、风险控制、截止日、触发器</p>
            <div className="mt-3">
              <input className="w-full p-2 border rounded" placeholder="实验标题" value={(data.experiments && data.experiments[0] && data.experiments[0].title) || ''} onChange={e=>setData(prev=>({...prev, experiments: [{ ...(prev.experiments||[])[0], title: e.target.value }, ...(prev.experiments||[]).slice(1)] }))} />
              <textarea className="w-full p-2 border rounded mt-2" rows={3} placeholder="目标（可量化）" value={(data.experiments && data.experiments[0] && data.experiments[0].goal) || ''} onChange={e=>setData(prev=>({...prev, experiments: [{ ...(prev.experiments||[])[0], goal: e.target.value }, ...(prev.experiments||[]).slice(1)] }))} />
              <textarea className="w-full p-2 border rounded mt-2" rows={4} placeholder="拆成 3-5 个最小行动步骤" value={(data.experiments && data.experiments[0] && data.experiments[0].steps && data.experiments[0].steps.join('\n')) || ''} onChange={e=>setData(prev=>({...prev, experiments: [{ ...(prev.experiments||[])[0], steps: e.target.value.split('\n') }, ...(prev.experiments||[]).slice(1)] }))} />
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={()=>{
                  if (!data.experiments || data.experiments.length===0) setData(prev=>({...prev, experiments: [ { title: '两周小实验', goal: '验证目标', steps: ['明确MVP','投放/收集反馈','整理/决定'] } ] }));
                  alert('已生成模板到第1张实验卡，可编辑后保存。');
                }}>生成模板</button>
              </div>
            </div>
          </div>
        );

      case 'E2':
        return (
          <div>
            <h2 className="text-xl font-semibold">E2 · 每周复盘四问</h2>
            <ol className="list-decimal ml-6 mt-2 space-y-2">
              <li>我做了什么？产出与数据？</li>
              <li>我学到了什么？会怎么改？</li>
              <li>哪个价值观被满足/被违背？感受？</li>
              <li>下周最小行动清单（不超过3项）。</li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">可以把每周复盘作为一个重复任务放入你的日历或纸质笔记里。</p>
          </div>
        );

      case 'RESULT':
        return (
          <div>
            <h2 className="text-xl font-semibold">结果与导出</h2>
            <p className="text-sm text-gray-600 mt-2">下面是基于你已填写内容的即时提炼（点击“运行分析”可更新）</p>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={()=>runAnalysis()}>运行分析 / 提炼</button>
              <button className="px-3 py-1 rounded border" onClick={()=>generateDirectionCandidates()}>把候选填入 D1</button>
              <button className="px-3 py-1 rounded" onClick={exportJSON}>导出 JSON</button>
              <button className="px-3 py-1 rounded" onClick={()=>window.print()}>打印 / 导出 PDF</button>
            </div>

            {analysis ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded bg-white">
                  <div className="font-medium">提炼到的价值词（优先）</div>
                  <div className="mt-2 text-sm">手动选择：{(data.selected_values||[]).join('、') || '—'}</div>
                  <ol className="list-decimal ml-6 mt-2">
                    {analysis.combinedValues.slice(0,8).map((v,i)=> (<li key={i}>{v}</li>))}
                  </ol>
                </div>

                <div className="p-3 border rounded bg-white">
                  <div className="font-medium">提炼到的天赋/高频关键词</div>
                  <div className="mt-2 text-sm">（从你填写的天赋/作品中自动抽取）</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.skillPairs.slice(0,8).map((s,i)=>(<span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm">{s}</span>))}
                  </div>
                </div>

                <div className="p-3 border rounded bg-white md:col-span-2">
                  <div className="font-medium">智能生成的方向句（建议写 3 个并挑一个）</div>
                  <div className="mt-2 space-y-2">
                    {analysis.variants.map((v,i)=> (
                      <div key={i} className="p-2 border rounded bg-indigo-50">{v}</div>
                    ))}
                  </div>
                </div>

                <div className="p-3 border rounded bg-white md:col-span-2">
                  <div className="font-medium">默认两周小实验模板（可编辑）</div>
                  <div className="mt-2 text-sm">{analysis.experimentTemplate.title}</div>
                  <ol className="list-decimal ml-6 mt-2">
                    {analysis.experimentTemplate.steps.map((s,i)=>(<li key={i}>{s}</li>))}
                  </ol>
                  <div className="mt-2 text-xs text-gray-500">指标：反馈 &lt;{analysis.experimentTemplate.metrics.targetFeedback}&gt;，阅读 &lt;{analysis.experimentTemplate.metrics.targetReads}&gt;</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">还没有运行分析。点击“运行分析 / 提炼”。</div>
            )}

            <div className="mt-6">
              <div className="font-medium">导出 / 分享</div>
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={exportJSON}>导出 JSON</button>
                <button className="px-3 py-1 rounded border" onClick={()=>{navigator.clipboard && navigator.clipboard.writeText(JSON.stringify({ data, analysis }, null, 2)); alert('已复制到剪贴板');}}>复制到剪贴板</button>
                <button className="px-3 py-1 rounded" onClick={()=>window.print()}>打印 / 导出 PDF</button>
              </div>
            </div>
          </div>
        );

      default:
        return <div>未实现的步骤</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <div>
          <StepNav />
        </div>

        <div>
          <div className="p-4 rounded-2xl bg-white shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">人生方向自测</h1>
                <div className="text-sm text-gray-500">基于「价值观 — 天赋 — 梦想」的分步引导（参考：八木仁平方法）</div>
              </div>
              <div className="text-sm text-gray-600">步骤 {stepIndex+1} / {steps.length}</div>
            </div>

            <div className="mt-4">
              <StepContent />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <button className="px-4 py-2 mr-2 rounded border" onClick={prev} disabled={stepIndex===0}>上一步</button>
                <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={next} disabled={stepIndex===steps.length-1}>下一步</button>
              </div>

              <div className="flex gap-2 items-center">
                <button className="px-3 py-2 rounded border" onClick={saveNow}>保存</button>
                <button className="px-3 py-2 rounded" onClick={()=>{ setField('direction_variants', data.direction_variants && data.direction_variants.length>0 ? data.direction_variants : ['','','']); runAnalysis(); setStepIndex(steps.findIndex(s=>s.id==='RESULT'));}}>完成并查看结果</button>
              </div>
            </div>

          </div>

          <div className="mt-4 text-xs text-gray-500">小贴士：不要追求一次写完——先写草稿、跑实验、再用复盘把方向验证/淘汰。</div>
        </div>
      </div>
    </div>
  );
}
