# 剧情/事件生成器 - 高级包装
# 对外提供更友好的 API，内部调用 ai_service

extends Node

# 单例模式
var _ai: Node = null


func _ready():
	_ai = get_node("/root/AIService")


func generate_random_event(player_stage: String, resources: Dictionary) -> Dictionary:
	"""生成随机事件"""
	var situation = _get_situation_by_stage(player_stage)
	var context = {
		"situation": situation,
		"player_stage": player_stage,
		"resources": JSON.stringify(resources)
	}
	
	var description = _ai.generate_event_description(context)
	
	# 生成事件结果
	var event_type = _roll_event_type()
	var outcome = _generate_outcome(event_type, resources)
	
	return {
		"description": description,
		"type": event_type,
		"outcome": outcome,
		"timestamp": Time.get_unix_time_from_system()
	}


func generate_mission(mission_type: String, objective: String, difficulty: int) -> Dictionary:
	"""生成任务简报"""
	var context = {
		"mission_type": mission_type,
		"objective": objective,
		"difficulty": _difficulty_to_string(difficulty)
	}
	
	var briefing = _ai.generate_mission_briefing(context)
	
	return {
		"briefing": briefing,
		"type": mission_type,
		"objective": objective,
		"difficulty": difficulty,
		"rewards": _generate_rewards(mission_type, difficulty)
	}


func generate_item_backstory(item_name: String, item_type: String, player_stage: String) -> String:
	"""生成物品背景故事"""
	var context = {
		"item_name": item_name,
		"item_type": item_type,
		"player_stage": player_stage
	}
	return _ai.generate_item_lore(context)


func generate_location_story(location_type: String, features: Array, danger_level: int) -> String:
	"""生成地点故事"""
	var context = {
		"location_type": location_type,
		"features": features.join("、"),
		"danger_level": _danger_to_string(danger_level)
	}
	return _ai.generate_location_description(context)


# ==================== 内部方法 ====================

func _get_situation_by_stage(stage: String) -> String:
	var situations = {
		"raft": "木筏在海浪中摇晃，你发现前方有东西...",
		"canoe": "独木舟缓缓前行，远处有什么在闪烁...",
		"sailboat": "帆船航行中，水手报告了异常情况...",
		"steamship": "蒸汽船的汽笛响起，海面上出现了...",
		"cruiser": "巡洋舰在波涛中前进，雷达探测到...",
		"aircraft_carrier": "航母编队航行，侦察机发现了..."
	}
	return situations.get(stage, "海上发生了什么...")


func _roll_event_type() -> String:
	var roll = randf()
	if roll < 0.4:
		return "positive"  # 40% 好事
	elif roll < 0.7:
		return "neutral"   # 30% 中立
	else:
		return "negative"  # 30% 坏事


func _generate_outcome(event_type: String, resources: Dictionary) -> Dictionary:
	var outcome = {"type": event_type, "gained": {}, "lost": {}}
	
	match event_type:
		"positive":
			var resource = _random_resource()
			var amount = randi() % 30 + 10
			outcome.gained[resource] = amount
		"negative":
			var resource = _random_losable_resource()
			var amount = randi() % 20 + 5
			outcome.lost[resource] = amount
		"neutral":
			# 中立事件可能获得也可能损失
			if randf() < 0.5:
				outcome.gained[_random_resource()] = randi() % 10 + 1
			else:
				outcome.lost[_random_losable_resource()] = randi() % 10 + 1
	
	return outcome


func _generate_rewards(mission_type: String, difficulty: int) -> Dictionary:
	var base_multiplier = 1.0 + difficulty * 0.5
	
	return {
		"tech_points": int(20 * base_multiplier),
		"resources": _generate_random_resources(difficulty),
		"reputation": randi() % 10 + 1
	}


func _difficulty_to_string(difficulty: int) -> String:
	var names = ["简单", "普通", "困难", "极难", "噩梦"]
	return names[clamp(difficulty, 0, 4)]


func _danger_to_string(level: int) -> String:
	var names = ["安全", "较安全", "一般", "危险", "极度危险"]
	return names[clamp(level, 0, 4)]


func _random_resource() -> String:
	var resources = ["木材", "金属", "布料", "食物", "淡水", "燃料", "矿石", "香料", "塑料", "电子产品"]
	return resources[randi() % resources.size()]


func _random_losable_resource() -> String:
	var resources = ["食物", "淡水", "燃料", "木材", "布料"]
	return resources[randi() % resources.size()]


func _generate_random_resources(difficulty: int) -> Dictionary:
	var count = 2 + difficulty
	var resources = {}
	var all_resources = ["木材", "金属", "布料", "食物", "淡水", "燃料", "矿石", "香料"]
	
	for i in range(count):
		var res = all_resources[randi() % all_resources.size()]
		resources[res] = randi() % 20 + 10
	
	return resources
