# 测试任务管理器 - v1.1
# AI 发布测试任务 → 玩家执行 → 反馈结果

extends Node

signal task_published(task_id: String, task_data: Dictionary)
signal task_completed(task_id: String, result: Dictionary)
signal task_rewarded(task_id: String, player_id: String, reward: int)

const TASKS_FILE = "user://ai_evolution/test_tasks.cfg"

# 测试任务类型
enum TaskType {
	FEATURE_TEST,     # 功能测试
	REGRESSION_TEST,   # 回归测试
	EXPLORATORY_TEST,  # 探索性测试
	PERFORMANCE_TEST,  # 性能测试
	BALANCE_TEST       # 平衡性测试
}

# 奖励配置
const REWARD_TASK_COMPLETE = 30
const REWARD_BONUS_PERFECT = 20  # 完美完成额外奖励

var _active_tasks: Dictionary = {}
var _completed_tasks: Array = []
var _task_templates: Dictionary = {}


func _ready():
	_load_tasks()
	_generate_initial_tasks()


# ==================== 任务生成 ====================

## AI 生成新的测试任务
func generate_test_task(task_type: TaskType, context: Dictionary = {}) -> Dictionary:
	var task_id = "task_%s_%d" % [task_type as String, Time.get_unix_time_from_system()]
	
	var task = {
		"id": task_id,
		"type": task_type,
		"title": _get_task_title(task_type),
		"description": _get_task_description(task_type, context),
		"objectives": _get_task_objectives(task_type, context),
		"expected_result": _get_expected_result(task_type, context),
		"difficulty": _calculate_difficulty(task_type, context),
		"reward": _calculate_reward(task_type),
		"status": "active",  # active, completed, expired
		"created_at": Time.get_datetime_string_from_system(),
		"expires_at": _calculate_expiry(task_type),
		"context": context,
		"completion_data": null
	}
	
	_active_tasks[task_id] = task
	_save_tasks()
	
	emit_signal("task_published", task_id, task)
	
	return {
		"success": true,
		"task_id": task_id,
		"task": task
	}


## 根据版本更新生成回归测试任务
func generate_regression_tasks(from_version: String, to_version: String) -> Array:
	var tasks = []
	
	# 为每个已修复的 bug 生成验证任务
	var bug_hunter = get_node_or_null("/root/BugHunterSystem")
	if bug_hunter:
		var fixed_bugs = bug_hunter.get_all_bugs("fixed")
		for bug_id in fixed_bugs:
			var bug = fixed_bugs[bug_id]
			var task = generate_test_task(TaskType.REGRESSION_TEST, {
				"bug_id": bug_id,
				"bug_title": bug.get("title", ""),
				"version": to_version
			})
			tasks.append(task)
	
	return tasks


## 生成功能测试任务（基于新增功能）
func generate_feature_test_task(new_feature: Dictionary) -> Dictionary:
	return generate_test_task(TaskType.FEATURE_TEST, {
		"feature_name": new_feature.get("name", "新功能"),
		"feature_description": new_feature.get("description", ""),
		"test_scenario": new_feature.get("test_scenario", "")
	})


# ==================== 任务执行 ====================

## 玩家领取任务
func claim_task(task_id: String, player_id: String = "player") -> Dictionary:
	if not _active_tasks.has(task_id):
		return {"success": false, "error": "任务不存在或已过期"}
	
	var task = _active_tasks[task_id]
	if task["status"] != "active":
		return {"success": false, "error": "任务状态不是进行中"}
	
	task["claimed_by"] = player_id
	task["claimed_at"] = Time.get_datetime_string_from_system()
	_save_tasks()
	
	return {
		"success": true,
		"message": "已领取任务: " + task["title"]
	}


## 玩家提交测试结果
func submit_test_result(task_id: String, result_data: Dictionary, player_id: String = "player") -> Dictionary:
	if not _active_tasks.has(task_id):
		return {"success": false, "error": "任务不存在"}
	
	var task = _active_tasks[task_id]
	if task["status"] != "active":
		return {"success": false, "error": "任务已完成或过期"}
	
	# 评估测试结果
	var evaluation = _evaluate_result(task, result_data)
	
	task["status"] = "completed"
	task["completion_data"] = {
		"result": result_data,
		"evaluation": evaluation,
		"completed_by": player_id,
		"completed_at": Time.get_datetime_string_from_system()
	}
	
	_completed_tasks.append(task)
	_active_tasks.erase(task_id)
	_save_tasks()
	
	# 发放奖励
	var total_reward = task["reward"]
	if evaluation["rating"] == "perfect":
		total_reward += REWARD_BONUS_PERFECT
	
	_award_player(player_id, total_reward, task_id)
	
	emit_signal("task_completed", task_id, evaluation)
	
	return {
		"success": true,
		"evaluation": evaluation,
		"reward": total_reward,
		"message": _get_completion_message(evaluation)
	}


## 评估测试结果
func _evaluate_result(task: Dictionary, result: Dictionary) -> Dictionary:
	var rating = "pass"
	var score = 100
	var feedback = []
	
	# 检查是否完成所有目标
	var objectives = task.get("objectives", [])
	var completed_objectives = result.get("completed_objectives", [])
	var missed_objectives = []
	
	for obj in objectives:
		if obj not in completed_objectives:
			missed_objectives.append(obj)
	
	if missed_objectives.size() > 0:
		rating = "incomplete"
		score -= missed_objectives.size() * 20
		feedback.append("未完成目标: " + ", ".join(missed_objectives))
	
	# 检查是否发现新问题
	if result.get("found_new_issues", false):
		rating = "excellent"
		score += 20
		feedback.append("发现新问题，感谢！")
	
	# 检查 bug 是否复现
	if task["type"] == TaskType.REGRESSION_TEST:
		var bug_still_exists = result.get("bug_still_exists", false)
		if bug_still_exists:
			rating = "failed"
			score = 0
			feedback.append("Bug 仍然存在！")
	
	# 评分等级
	if score >= 100 and rating != "excellent":
		rating = "perfect"
	elif score >= 70:
		rating = "pass"
	elif score >= 40:
		rating = "incomplete"
	else:
		rating = "failed"
	
	return {
		"rating": rating,
		"score": score,
		"feedback": feedback,
		"completed_objectives": completed_objectives,
		"missed_objectives": missed_objectives
	}


# ==================== 任务查询 ====================

func get_active_tasks() -> Array:
	var tasks = []
	for task_id in _active_tasks:
		tasks.append(_active_tasks[task_id])
	return tasks


func get_task(task_id: String) -> Dictionary:
	return _active_tasks.get(task_id, {})


func get_tasks_by_type(task_type: TaskType) -> Array:
	var tasks = []
	for task_id in _active_tasks:
		if _active_tasks[task_id]["type"] == task_type:
			tasks.append(_active_tasks[task_id])
	return tasks


func get_player_progress(player_id: String = "player") -> Dictionary:
	var claimed = 0
	var completed = 0
	var total_reward = 0
	
	for task_id in _active_tasks:
		if _active_tasks[task_id].get("claimed_by") == player_id:
			claimed += 1
	
	for task in _completed_tasks:
		if task.get("completion_data", {}).get("completed_by") == player_id:
			completed += 1
			total_reward += task.get("reward", 0)
	
	return {
		"claimed_tasks": claimed,
		"completed_tasks": completed,
		"total_reward": total_reward
	}


# ==================== 辅助 ====================

func _get_task_title(task_type: TaskType) -> String:
	var titles = {
		TaskType.FEATURE_TEST: "功能测试任务",
		TaskType.REGRESSION_TEST: "回归测试任务",
		TaskType.EXPLORATORY_TEST: "探索性测试任务",
		TaskType.PERFORMANCE_TEST: "性能测试任务",
		TaskType.BALANCE_TEST: "平衡性测试任务"
	}
	return titles.get(task_type, "测试任务")


func _get_task_description(task_type: TaskType, context: Dictionary) -> String:
	match task_type:
		TaskType.FEATURE_TEST:
			return "测试新功能: %s\n%s" % [
				context.get("feature_name", "?"),
				context.get("feature_description", "")
			]
		TaskType.REGRESSION_TEST:
			return "验证 Bug 修复: %s\n版本: %s" % [
				context.get("bug_title", "?"),
				context.get("version", "?")
			]
		TaskType.EXPLORATORY_TEST:
			return "探索游戏，发现问题并报告"
		TaskType.PERFORMANCE_TEST:
			return "测试游戏性能和帧率稳定性"
		TaskType.BALANCE_TEST:
			return "测试游戏平衡性，提供调整建议"
	return ""


func _get_task_objectives(task_type: TaskType, context: Dictionary) -> Array:
	match task_type:
		TaskType.FEATURE_TEST:
			return ["完成基本功能测试", "尝试各种操作", "报告任何异常"]
		TaskType.REGRESSION_TEST:
			return ["复现原始 Bug", "验证 Bug 已修复", "检查是否引入新问题"]
		TaskType.EXPLORATORY_TEST:
			return ["探索新区域", "尝试新功能", "发现并报告问题"]
		TaskType.PERFORMANCE_TEST:
			return ["检查帧率", "观察卡顿情况", "测试长时间运行"]
		TaskType.BALANCE_TEST:
			return ["测试战斗难度", "检查资源获取", "评估游戏节奏"]
	return []


func _get_expected_result(task_type: TaskType, context: Dictionary) -> String:
	return "完成所有目标并提交详细报告"


func _calculate_difficulty(task_type: TaskType, context: Dictionary) -> int:
	match task_type:
		TaskType.FEATURE_TEST: return 2
		TaskType.REGRESSION_TEST: return 1
		TaskType.EXPLORATORY_TEST: return 3
		TaskType.PERFORMANCE_TEST: return 2
		TaskType.BALANCE_TEST: return 3
	return 2


func _calculate_reward(task_type: TaskType) -> int:
	match task_type:
		TaskType.FEATURE_TEST: return 30
		TaskType.REGRESSION_TEST: return 20
		TaskType.EXPLORATORY_TEST: return 40
		TaskType.PERFORMANCE_TEST: return 25
		TaskType.BALANCE_TEST: return 35
	return 30


func _calculate_expiry(task_type: TaskType) -> String:
	# 24小时后过期
	var expiry = Time.get_unix_time_from_system() + 86400
	return Time.get_datetime_string_from_unix_time(expiry)


func _award_player(player_id: String, amount: int, task_id: String):
	# 奖励通过 BugHunterSystem 发放
	var bug_hunter = get_node_or_null("/root/BugHunterSystem")
	if bug_hunter:
		# 创建一个虚拟的"建议"来记录奖励
		bug_hunter.submit_suggestion({
			"title": "测试任务奖励",
			"description": "完成任务 %s 获得奖励" % task_id,
			"author": player_id
		})
	
	emit_signal("task_rewarded", task_id, player_id, amount)


func _get_completion_message(evaluation: Dictionary) -> String:
	match evaluation["rating"]:
		"perfect":
			return "🎉 完美完成！所有目标达成，额外奖励已发放！"
		"excellent":
			return "🌟 优秀！发现重要问题，额外加分！"
		"pass":
			return "✅ 任务完成，奖励已发放"
		"incomplete":
			return "⚠️ 部分完成，请补充遗漏的目标"
		"failed":
			return "❌ 任务失败，请重试"
	return ""


func _generate_initial_tasks():
	# 生成初始测试任务
	if _active_tasks.size() == 0:
		generate_test_task(TaskType.EXPLORATORY_TEST, {
			"description": "第一次探索！试试在水面上移动，看看有没有什么问题"
		})


# ==================== 持久化 ====================

func _load_tasks():
	var config = ConfigFile.new()
	if config.load(TASKS_FILE) == OK:
		_active_tasks = config.get_value("tasks", "active", {})
		_completed_tasks = config.get_value("tasks", "completed", [])


func _save_tasks():
	var config = ConfigFile.new()
	config.set_value("tasks", "active", _active_tasks)
	config.set_value("tasks", "completed", _completed_tasks)
	config.save(TASKS_FILE)
