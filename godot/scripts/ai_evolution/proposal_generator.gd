# 变更提案生成器 - 分析游戏状态，AI 生成改进提案
# 基于代码分析结果，生成可执行的代码变更计划

extends Node

var _ai: Node = null

# 预定义的游戏迭代方向
const ITERATION_DIMENSIONS = {
	"combat": ["武器系统", "伤害计算", "敌人AI", "战斗平衡"],
	"exploration": ["地图生成", "随机事件", "资源分布", "藏宝图"],
	"progression": ["进化树", "科技树", "升级系统", "解锁机制"],
	"ui": ["HUD界面", "道具栏", "小地图", "任务追踪"],
	"audio": ["背景音乐", "音效", "语音", "环境音"],
	"performance": ["加载优化", "帧率稳定", "内存管理", "渲染优化"],
	"multiplayer": ["网络同步", "大厅系统", "P2P连接", "反作弊"],
	"accessibility": ["新手教程", "难度选项", "色盲模式", "字幕"]
}


func _ready():
	_ai = get_node_or_null("/root/AIService")


# ==================== 核心 API ====================

func generate_proposals(analysis: Dictionary) -> Array:
	var proposals: Array = []
	
	# 1. 基于代码分析生成基础提案
	var base_proposals = _generate_base_proposals(analysis)
	proposals.append_array(base_proposals)
	
	# 2. 使用 AI 生成高级提案
	var ai_proposals = _generate_ai_proposals(analysis)
	proposals.append_array(ai_proposals)
	
	# 3. 评估和排序提案
	proposals = _rank_proposals(proposals, analysis)
	
	return proposals


# ==================== 基础提案生成 ====================

func _generate_base_proposals(analysis: Dictionary) -> Array:
	var proposals: Array = []
	var systems = analysis.get("gameplay_systems", [])
	var metrics = analysis.get("code_metrics", {})
	
	# 检查每个游戏系统是否完整
	for system in systems:
		var system_proposals = _check_system_completeness(system, analysis)
		proposals.append_array(system_proposals)
	
	# 基于指标的提案
	if metrics.get("total_scripts", 0) < 5:
		proposals.append(_create_proposal(
			"add_core_system",
			"添加核心游戏系统",
			"当前脚本数量较少，建议添加更多游戏系统",
			"medium",
			2,
			{"type": "new_system", "suggestion": "添加合成系统或任务系统"}
		))
	
	# 检查缺失的系统组件
	var missing_components = _find_missing_components(analysis)
	for component in missing_components:
		proposals.append(_create_proposal(
			"add_component",
			"添加组件: " + component.name,
			component.description,
			"low",
			1,
			{"component": component.name, "path": component.path}
		))
	
	return proposals


func _check_system_completeness(system_name: String, analysis: Dictionary) -> Array:
	var proposals: Array = []
	var classes = analysis.get("class_definitions", [])
	
	# 定义每个系统应有的核心类
	var required_classes = {
		"combat": ["CombatSystem", "Weapon", "Projectile", "DamageCalculator"],
		"vehicle": ["Vehicle", "VehicleData", "Attachment"],
		"ui": ["HUD", "InventoryUI", "MenuUI"],
		"core": ["GameState", "SaveSystem"],
		"ai": ["AIService", "NarrativeGenerator"]
	}
	
	var required = required_classes.get(system_name, [])
	var existing = classes.filter(func(c): return c.name in required)
	
	if existing.size() < required.size():
		var missing = required.filter(func(r): return not existing.any(func(e): return e.name == r))
		for m in missing:
			proposals.append(_create_proposal(
				"missing_class",
				"系统不完整: " + system_name,
				"缺少核心类: " + m,
				"high",
				3,
				{"system": system_name, "missing_class": m}
			))
	
	return proposals


func _find_missing_components(analysis: Dictionary) -> Array:
	var missing = []
	var classes = analysis.get("class_definitions", [])
	var class_names = classes.map(func(c): return c.name)
	
	# 检查常见组件
	var common_components = [
		{"name": "Config", "description": "游戏配置管理", "path": "scripts/core/"},
		{"name": "EventBus", "description": "事件总线", "path": "scripts/core/"},
		{"name": "PoolManager", "description": "对象池管理", "path": "scripts/core/"}
	]
	
	for comp in common_components:
		if not class_names.has(comp.name):
			missing.append(comp)
	
	return missing


# ==================== AI 提案生成 ====================

func _generate_ai_proposals(analysis: Dictionary) -> Array:
	var proposals: Array = []
	
	if not _ai:
		return proposals
	
	# 构建分析摘要
	var summary = _build_analysis_summary(analysis)
	
	# 生成游戏改进提案
	var improvement_prompt = """你是游戏设计师。基于以下游戏代码分析，生成3-5个具体的迭代改进提案。

分析摘要:
{summary}

要求:
1. 每个提案包含: 标题、描述、优先级(1-5)、影响分数(1-5)、具体变更内容
2. 考虑游戏平衡性、玩家体验、内容深度
3. 优先选择中等影响、见效快的改进
4. 用JSON数组格式输出

输出格式:
[{"title":"...","description":"...","priority":3,"impact_score":2,"changes":{"type":"...","details":"..."}}]""".format({"summary": summary})
	
	var ai_result = _ai.generate({"summary": summary}, "game_improvement")
	
	if ai_result != "":
		var parsed = _parse_ai_proposals(ai_result)
		for p in parsed:
			p.source = "ai"
			p.id = "ai_proposal_" + str(Time.get_unix_time_from_system())
			proposals.append(p)
	
	return proposals


func _build_analysis_summary(analysis: Dictionary) -> String:
	var summary_parts = []
	
	var metrics = analysis.get("code_metrics", {})
	summary_parts.append("代码规模: %d 个脚本, %d 行代码, %d 个函数" % [
		metrics.get("total_scripts", 0),
		metrics.get("total_lines", 0),
		metrics.get("total_functions", 0)
	])
	
	var systems = analysis.get("gameplay_systems", [])
	summary_parts.append("已实现的系统: " + ", ".join(systems))
	
	var classes = analysis.get("class_definitions", [])
	summary_parts.append("核心类: " + ", ".join(classes.map(func(c): return c.name).slice(0, 10)))
	
	return "\n".join(summary_parts)


func _parse_ai_proposals(ai_output: String) -> Array:
	var proposals: Array = []
	
	# 尝试解析 JSON
	var json = JSON.new()
	var parse_result = json.parse(ai_output)
	
	if parse_result == OK and json.get_data() is Array:
		var data = json.get_data()
		for item in data:
			if item is Dictionary:
				proposals.append(_normalize_proposal(item))
	
	return proposals


func _normalize_proposal(proposal: Dictionary) -> Dictionary:
	return {
		"id": proposal.get("id", "unknown"),
		"title": proposal.get("title", "未命名提案"),
		"description": proposal.get("description", ""),
		"priority": proposal.get("priority", 3),
		"impact_score": proposal.get("impact_score", 2),
		"changes": proposal.get("changes", {}),
		"source": proposal.get("source", "unknown")
	}


# ==================== 提案排序 ====================

func _rank_proposals(proposals: Array, analysis: Dictionary) -> Array:
	# 计算综合分数并排序
	for proposal in proposals:
		var score = _calculate_proposal_score(proposal, analysis)
		proposal.sort_score = score
	
	proposals.sort_custom(func(a, b):
		return a.get("sort_score", 0) > b.get("sort_score", 0)
	)
	
	return proposals


func _calculate_proposal_score(proposal: Dictionary, analysis: Dictionary) -> float:
	var priority = proposal.get("priority", 3)
	var impact = proposal.get("impact_score", 2)
	var risk = _estimate_risk(proposal, analysis)
	
	# 分数 = 优先级 * 0.4 + 影响 * 0.4 - 风险 * 0.2
	var score = priority * 0.4 + impact * 0.4 - risk * 0.2
	
	return score


func _estimate_risk(proposal: Dictionary, analysis: Dictionary) -> float:
	var changes = proposal.get("changes", {})
	var change_type = changes.get("type", "")
	
	# 风险评估
	var risk_map = {
		"new_system": 0.3,
		"new_file": 0.2,
		"modify_function": 0.5,
		"add_class": 0.3,
		"add_variable": 0.4,
		"ui_change": 0.6
	}
	
	return risk_map.get(change_type, 0.5)


# ==================== 辅助 ====================

func _create_proposal(id: String, title: String, description: String, priority: String, impact: int, changes: Dictionary) -> Dictionary:
	var priority_map = {"low": 1, "medium": 3, "high": 5}
	
	return {
		"id": id,
		"title": title,
		"description": description,
		"priority": priority_map.get(priority, 3),
		"impact_score": impact,
		"changes": changes,
		"source": "system"
	}
