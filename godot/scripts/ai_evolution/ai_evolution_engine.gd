# AI 演进引擎 - 核心控制器
# 负责协调代码分析、变更生成、代码修改、验证的完整流程

extends Node

const VERSION_FILE = "user://ai_evolution/version.cfg"
const BACKUP_DIR = "user://ai_evolution/backups/"
const ITERATIONS_DIR = "user://ai_evolution/iterations/"
const PROPOSALS_DIR = "user://ai_evolution/proposals/"

var _analyzer: Node = null
var _proposal_generator: Node = null
var _code_modifier: Node = null
var _validator: Node = null
var _ai: Node = null

var _current_version: String = "1.0.0"
var _iteration_count: int = 0
var _evolution_log: Array = []


func _ready():
	_init_directories()
	_init_components()
	_load_version_info()


func _init_directories():
	DirAccess.make_dir_recursive_absolute(BACKUP_DIR)
	DirAccess.make_dir_recursive_absolute(ITERATIONS_DIR)
	DirAccess.make_dir_recursive_absolute(PROPOSALS_DIR)


func _init_components():
	_analyzer = preload("code_analyzer.gd").new()
	add_child(_analyzer)
	
	_proposal_generator = preload("proposal_generator.gd").new()
	add_child(_proposal_generator)
	
	_code_modifier = preload("code_modifier.gd").new()
	add_child(_code_modifier)
	
	_validator = preload("game_validator.gd").new()
	add_child(_validator)
	
	_ai = get_node_or_null("/root/AIService")


# ==================== 核心 API ====================

## 请求 AI 生成新迭代
func request_iteration() -> Dictionary:
	print("[AI Evolution] 开始新迭代...")
	
	# 1. 分析当前代码状态
	var analysis = _analyzer.analyze_current_state()
	print("[AI Evolution] 代码分析完成: ", analysis.keys())
	
	# 2. 生成变更提案
	var proposals = _proposal_generator.generate_proposals(analysis)
	print("[AI Evolution] 生成了 ", proposals.size(), " 个提案")
	
	if proposals.size() == 0:
		return {"success": false, "reason": "无法生成有效提案"}
	
	# 3. 选择最佳提案
	var selected_proposal = _select_best_proposal(proposals)
	
	# 4. 备份当前版本
	var backup_path = _code_modifier.backup_current_version()
	print("[AI Evolution] 备份已保存: ", backup_path)
	
	# 5. 应用变更
	var apply_result = _code_modifier.apply_proposal(selected_proposal)
	if not apply_result.success:
		_code_modifier.restore_from_backup(backup_path)
		return apply_result
	
	# 6. 验证变更
	var validation = _validator.validate_game()
	if not validation.success:
		_code_modifier.restore_from_backup(backup_path)
		return {"success": false, "reason": "验证失败: " + validation.error}
	
	# 7. 保存迭代记录
	_iteration_count += 1
	_current_version = _bump_version()
	_save_iteration_record(selected_proposal, analysis, validation)
	
	# 8. 记录到日志
	_evolution_log.append({
		"version": _current_version,
		"iteration": _iteration_count,
		"proposal": selected_proposal.get("title", "未命名"),
		"timestamp": Time.get_datetime_string_from_system()
	})
	
	print("[AI Evolution] 迭代完成: v", _current_version)
	
	return {
		"success": true,
		"version": _current_version,
		"iteration": _iteration_count,
		"proposal": selected_proposal,
		"changes": apply_result.changes
	}


## 获取演进历史
func get_evolution_history() -> Array:
	return _evolution_log


## 获取当前版本
func get_current_version() -> String:
	return _current_version


## 获取迭代次数
func get_iteration_count() -> int:
	return _iteration_count


# ==================== 内部方法 ====================

func _select_best_proposal(proposals: Array) -> Dictionary:
	# 简单策略：选择优先级最高且影响适中的
	proposals.sort_custom(func(a, b):
		var priority_a = a.get("priority", 0)
		var priority_b = b.get("priority", 0)
		if priority_a != priority_b:
			return priority_a > priority_b
		var impact_a = a.get("impact_score", 0)
		var impact_b = b.get("impact_score", 0)
		# 优先中等影响，避免太大改动
		return abs(impact_a - 2) < abs(impact_b - 2)
	)
	return proposals[0]


func _bump_version() -> String:
	var parts = _current_version.split(".")
	var major = parts[0].to_int()
	var minor = parts[1].to_int()
	var patch = parts[2].to_int()
	
	patch += 1
	if patch >= 10:
		patch = 0
		minor += 1
	if minor >= 10:
		minor = 0
		major += 1
	
	return str(major) + "." + str(minor) + "." + str(patch)


func _save_iteration_record(proposal: Dictionary, analysis: Dictionary, validation: Dictionary):
	var record = {
		"version": _current_version,
		"iteration": _iteration_count,
		"proposal": proposal,
		"analysis": analysis,
		"validation": validation,
		"timestamp": Time.get_datetime_string_from_system()
	}
	
	var config = ConfigFile.new()
	config.set_value("iteration", str(_iteration_count), record)
	config.save(ITERATIONS_DIR + "iteration_%s.cfg" % _current_version)
	
	# 更新版本文件
	_save_version_info()


func _load_version_info():
	var config = ConfigFile.new()
	if config.load(VERSION_FILE) == OK:
		_current_version = config.get_value("version", "current", "1.0.0")
		_iteration_count = config.get_value("version", "iteration", 0)
		_evolution_log = config.get_value("version", "log", [])


func _save_version_info():
	var config = ConfigFile.new()
	config.set_value("version", "current", _current_version)
	config.set_value("version", "iteration", _iteration_count)
	config.set_value("version", "log", _evolution_log)
	config.save(VERSION_FILE)


# ==================== 调试接口 ====================

func debug_force_iteration():
	"""强制执行一次迭代（调试用）"""
	return request_iteration()


func debug_get_analysis():
	"""获取当前代码分析"""
	return _analyzer.analyze_current_state()


func debug_get_proposals():
	"""获取提案列表"""
	var analysis = _analyzer.analyze_current_state()
	return _proposal_generator.generate_proposals(analysis)


func debug_list_iterations():
	"""列出所有迭代版本"""
	var iterations = []
	var dir = DirAccess.open(ITERATIONS_DIR)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			if file_name.ends_with(".cfg"):
				iterations.append(file_name.replace(".cfg", ""))
			file_name = dir.get_next()
	return iterations
