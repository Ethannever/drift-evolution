# Bug 猎人系统 - v1.1
# 玩家发现bug得奖励机制 + 测试闭环

extends Node

signal bug_reported(bug_id: String, bug_data: Dictionary)
signal bug_fixed(bug_id: String)
signal bug_verified(bug_id: String, verifier: String)
signal reward_claimed(bug_id: String, player_id: String, reward: int)

const BUG_FILE = "user://ai_evolution/bugs.cfg"
const REWARD_BUG_FOUND = 50
const REWARD_BUG_VERIFIED = 20
const REWARD_SUGGESTION = 10
const REWARD_REGRESSION = 5

var _bugs: Dictionary = {}
var _player_rewards: Dictionary = {}
var _test_version: String = "1.1.0"


func _ready():
	_load_bugs()


# ==================== Bug 报告 ====================

## 报告一个 Bug
func report_bug(bug_data: Dictionary) -> Dictionary:
	var bug_id = "bug_%d" % Time.get_unix_time_from_system()
	
	var bug = {
		"id": bug_id,
		"title": bug_data.get("title", "未命名Bug"),
		"description": bug_data.get("description", ""),
		"severity": bug_data.get("severity", "medium"),  # low, medium, high, critical
		"reproducible": bug_data.get("reproducible", true),
		"steps": bug_data.get("steps", []),  # 重现步骤
		"screenshots": bug_data.get("screenshots", []),
		"reporter": bug_data.get("reporter", "player"),
		"reported_at": Time.get_datetime_string_from_system(),
		"status": "open",  # open, in_progress, fixed, verified, closed
		"ai_response": "",
		"rewards_claimed": [],
		"comments": []
	}
	
	_bugs[bug_id] = bug
	_save_bugs()
	
	emit_signal("bug_reported", bug_id, bug)
	
	# 记录奖励
	_claim_reward(bug_id, bug["reporter"], REWARD_BUG_FOUND)
	
	return {
		"success": true,
		"bug_id": bug_id,
		"message": "Bug 已记录！获得 %d 科技点奖励 🎉" % REWARD_BUG_FOUND
	}


## AI 回应 Bug（后续由 AI 调用）
func ai_respond_to_bug(bug_id: String, response: String, fix_plan: String = "") -> Dictionary:
	if not _bugs.has(bug_id):
		return {"success": false, "error": "Bug 不存在"}
	
	_bugs[bug_id]["ai_response"] = response
	_bugs[bug_id]["status"] = "in_progress"
	if fix_plan != "":
		_bugs[bug_id]["fix_plan"] = fix_plan
	
	_save_bugs()
	
	return {"success": true, "message": "AI 已回应 Bug"}


## 标记 Bug 为已修复
func mark_bug_fixed(bug_id: String, fix_description: String = "") -> Dictionary:
	if not _bugs.has(bug_id):
		return {"success": false, "error": "Bug 不存在"}
	
	_bugs[bug_id]["status"] = "fixed"
	_bugs[bug_id]["fixed_at"] = Time.get_datetime_string_from_system()
	_bugs[bug_id]["fix_description"] = fix_description
	
	_save_bugs()
	emit_signal("bug_fixed", bug_id)
	
	return {"success": true, "message": "Bug 已标记为修复，等待验证"}


## 验证 Bug 修复
func verify_bug_fixed(bug_id: String, verifier: String = "player") -> Dictionary:
	if not _bugs.has(bug_id):
		return {"success": false, "error": "Bug 不存在"}
	
	var bug = _bugs[bug_id]
	
	if bug["status"] != "fixed":
		return {"success": false, "error": "Bug 尚未修复，无法验证"}
	
	bug["status"] = "verified"
	bug["verified_by"] = verifier
	bug["verified_at"] = Time.get_datetime_string_from_system()
	
	_save_bugs()
	emit_signal("bug_verified", bug_id, verifier)
	
	# 验证奖励
	_claim_reward(bug_id, verifier, REWARD_BUG_VERIFIED)
	
	return {
		"success": true,
		"message": "验证成功！获得 %d 科技点奖励 🎉" % REWARD_BUG_VERIFIED
	}


## 添加评论/追加信息
func add_bug_comment(bug_id: String, comment: String, author: String = "player") -> Dictionary:
	if not _bugs.has(bug_id):
		return {"success": false, "error": "Bug 不存在"}
	
	var new_comment = {
		"author": author,
		"text": comment,
		"timestamp": Time.get_datetime_string_from_system()
	}
	
	_bugs[bug_id]["comments"].append(new_comment)
	_save_bugs()
	
	return {"success": true, "message": "评论已添加"}


# ==================== 奖励系统 ====================

func _claim_reward(bug_id: String, player_id: String, amount: int):
	if not _player_rewards.has(player_id):
		_player_rewards[player_id] = {
			"total_points": 0,
			"claimed": [],
			"stats": {"bugs_found": 0, "bugs_verified": 0, "suggestions": 0}
		}
	
	_player_rewards[player_id]["claimed"].append({
		"bug_id": bug_id,
		"amount": amount,
		"timestamp": Time.get_datetime_string_from_system()
	})
	_player_rewards[player_id]["total_points"] += amount
	
	# 统计
	if amount == REWARD_BUG_FOUND:
		_player_rewards[player_id]["stats"]["bugs_found"] += 1
	elif amount == REWARD_BUG_VERIFIED:
		_player_rewards[player_id]["stats"]["bugs_verified"] += 1
	elif amount == REWARD_SUGGESTION:
		_player_rewards[player_id]["stats"]["suggestions"] += 1
	
	_save_player_rewards()
	emit_signal("reward_claimed", bug_id, player_id, amount)


func get_player_rewards(player_id: String = "player") -> Dictionary:
	if not _player_rewards.has(player_id):
		return {"total_points": 0, "claimed": [], "stats": {}}
	return _player_rewards[player_id]


func get_leaderboard() -> Array:
	var leaderboard = []
	for player_id in _player_rewards:
		leaderboard.append({
			"player_id": player_id,
			"points": _player_rewards[player_id]["total_points"],
			"stats": _player_rewards[player_id]["stats"]
		})
	
	leaderboard.sort_custom(func(a, b): return a.points > b.points)
	return leaderboard


# ==================== 建议系统 ====================

## 提出改进建议
func submit_suggestion(suggestion_data: Dictionary) -> Dictionary:
	var suggestion = {
		"id": "sug_%d" % Time.get_unix_time_from_system(),
		"title": suggestion_data.get("title", "改进建议"),
		"description": suggestion_data.get("description", ""),
		"category": suggestion_data.get("category", "general"),  # gameplay, ui, combat, balance, other
		"priority": suggestion_data.get("priority", "medium"),
		"author": suggestion_data.get("author", "player"),
		"submitted_at": Time.get_datetime_string_from_system(),
		"status": "pending",  # pending, reviewed, implemented, rejected
		"ai_response": ""
	}
	
	_save_suggestion(suggestion)
	_claim_reward(suggestion["id"], suggestion["author"], REWARD_SUGGESTION)
	
	return {
		"success": true,
		"message": "建议已提交！获得 %d 科技点 🎉" % REWARD_SUGGESTION,
		"suggestion_id": suggestion["id"]
	}


# ==================== 查询 ====================

func get_bug(bug_id: String) -> Dictionary:
	return _bugs.get(bug_id, {})


func get_all_bugs(status: String = "") -> Dictionary:
	if status == "":
		return _bugs
	
	var filtered = {}
	for bug_id in _bugs:
		if _bugs[bug_id]["status"] == status:
			filtered[bug_id] = _bugs[bug_id]
	return filtered


func get_open_bugs_count() -> int:
	var count = 0
	for bug_id in _bugs:
		if _bugs[bug_id]["status"] in ["open", "in_progress"]:
			count += 1
	return count


func get_test_stats() -> Dictionary:
	var stats = {
		"total_bugs": _bugs.size(),
		"open_bugs": 0,
		"fixed_bugs": 0,
		"verified_bugs": 0,
		"player_rewards": _player_rewards
	}
	
	for bug_id in _bugs:
		var status = _bugs[bug_id]["status"]
		if status in ["open", "in_progress"]:
			stats["open_bugs"] += 1
		elif status == "fixed":
			stats["fixed_bugs"] += 1
		elif status == "verified":
			stats["verified_bugs"] += 1
	
	return stats


# ==================== 持久化 ====================

func _load_bugs():
	var config = ConfigFile.new()
	if config.load(BUG_FILE) == OK:
		_bugs = config.get_value("bugs", "entries", {})
	
	var rewards_file = ConfigFile.new()
	if rewards_file.load("user://ai_evolution/rewards.cfg") == OK:
		_player_rewards = rewards_file.get_value("rewards", "players", {})


func _save_bugs():
	var config = ConfigFile.new()
	config.set_value("bugs", "entries", _bugs)
	config.save(BUG_FILE)


func _save_player_rewards():
	var config = ConfigFile.new()
	config.set_value("rewards", "players", _player_rewards)
	config.save("user://ai_evolution/rewards.cfg")


func _save_suggestion(suggestion: Dictionary):
	var config = ConfigFile.new()
	var suggestions = {}
	
	if config.load("user://ai_evolution/suggestions.cfg") == OK:
		suggestions = config.get_value("suggestions", "entries", {})
	
	suggestions[suggestion["id"]] = suggestion
	config.set_value("suggestions", "entries", suggestions)
	config.save("user://ai_evolution/suggestions.cfg")
