// 站点版本记录：唯一数据源。
// 发布新版本时在数组头部插入新条目即可，站点版本号自动取最新一条的 version。
// 版本号采用语义化版本：新增功能升 minor（x.Y.z），修复/文案微调升 patch（x.y.Z）。
// item.type 取值：feature（新功能）/ improve（优化）/ fix（修复）/ docs（文档）。

export const CHANGELOG = [
	{
		version: '1.4.1',
		date: '2026-09-03',
		title: '推广位上移到顶部',
		items: [
			{
				type: 'improve',
				text: '“竞速档案站 · CN”推广位从页脚上方移到页面顶部（模式切换栏之下），并加强描边提升可见度。',
			},
		],
	},
	{
		version: '1.4.0',
		date: '2026-09-02',
		title: '更新记录上线',
		items: [
			{
				type: 'feature',
				text: '页脚新增“更新记录”入口，可查看站点版本历史；发布新版本后自动提示未读。',
			},
			{
				type: 'improve',
				text: '完善异相仲裁赛季增益的按关卡渲染逻辑。',
			},
			{
				type: 'improve',
				text: '更新站点 logo 与顶部轮播横幅图。',
			},
		],
	},
	{
		version: '1.3.0',
		date: '2026-09-01',
		title: '虚构叙事污染等级',
		items: [
			{
				type: 'feature',
				text: '虚构叙事详情页支持展示污染等级徽标与描述（2026 期起生效）。',
			},
			{
				type: 'fix',
				text: '修复部分怪物中图无法解析的 id 提取问题。',
			},
		],
	},
	{
		version: '1.2.0',
		date: '2026-08-28',
		title: '直连数据源改造',
		items: [
			{
				type: 'improve',
				text: '全站 JSON 与怪物图片改为直连 static.nanoka.cc，不再随构建发布数据文件，降低托管带宽占用。',
			},
			{
				type: 'feature',
				text: '新增“竞速档案站 · CN”相关项目推广位。',
			},
		],
	},
	{
		version: '1.1.0',
		date: '2026-08-20',
		title: '云端预计算接入',
		items: [
			{
				type: 'improve',
				text: '优先消费数据源 computed/endgame 预计算结果，缺失时回退实时复算，缩短首屏等待。',
			},
			{
				type: 'improve',
				text: '趋势详情改为 6 路受控并发拉取，返回顺序与赛季列表保持一致。',
			},
		],
	},
	{
		version: '1.0.0',
		date: '2026-07-15',
		title: '四模式看板完整版',
		items: [
			{
				type: 'feature',
				text: '适配异相仲裁（peak）：按关卡拆分展示，趋势口径为整期总 HP 汇总。',
			},
			{
				type: 'improve',
				text: '同步 4.4 版本数据与怪物资源。',
			},
		],
	},
	{
		version: '0.3.0',
		date: '2026-07-09',
		title: '虚构叙事统计完善',
		items: [
			{
				type: 'improve',
				text: '完善虚构叙事统计口径：无限波以 monster_group_id_list 为主，并保底合并普通波缺失敌人。',
			},
			{
				type: 'improve',
				text: '重构怪物列表卡片与首页布局。',
			},
		],
	},
	{
		version: '0.2.0',
		date: '2026-07-08',
		title: '赛季切换与布局优化',
		items: [
			{
				type: 'feature',
				text: '详情页新增赛季切换浮层，可跳转相邻赛季。',
			},
			{
				type: 'improve',
				text: '优化全站布局与数据展示样式。',
			},
		],
	},
	{
		version: '0.1.0',
		date: '2026-07-07',
		title: '项目起步',
		items: [
			{
				type: 'feature',
				text: '星穹铁道终局血量趋势看板首版上线：忘却之庭 / 虚构叙事 / 末日幻影趋势与详情。',
			},
			{
				type: 'docs',
				text: '补全 README 与开发者文档。',
			},
		],
	},
]

export const APP_VERSION = CHANGELOG[0]?.version || '0.0.0'

const SEEN_KEY = 'hsr-endgame:changelog-seen-version'

export function hasUnreadChangelog() {
	try {
		return localStorage.getItem(SEEN_KEY) !== APP_VERSION
	} catch {
		return false
	}
}

export function markChangelogSeen() {
	try {
		localStorage.setItem(SEEN_KEY, APP_VERSION)
	} catch {
		// 存储不可用（如隐私模式）时静默跳过
	}
}
