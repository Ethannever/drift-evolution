# 进化系统 - v1.2
# 载具进化：木筏 → 独木舟 → 渔船 → ... → 航母

extends Node

signal evolution_started(from_stage: String, to_stage: String)
signal evolution_completed(old_vehicle: Node, new_vehicle: Node)
signal evolution_cancelled(reason: String)

const EVOLUTION_STAGES = {
	"raft": {
		"name": "木筏",
		"description": "简陋的木制漂浮物，只能随波逐流",
		"hp": 50,
		"speed": 100,
		"cargo": 5,
		"defense": 0,
		"weapons": [],
		"sprite": "res://assets/vehicles/raft.png",
		"next_stages": ["canoe"]
	},
	"canoe": {
		"name": "独木舟",
		"description": "人力推进的小船，可以短暂逆流",
		"hp": 100,
		"speed": 120,
		"cargo": 10,
		"defense": 2,
		"weapons": ["rusty_paddle"],
		"sprite": "res://assets/vehicles/canoe.png",
		"next_stages": ["fisher"]
	},
	"fisher": {
		"name": "渔船",
		"description": "装备渔网的船只，可以捕鱼",
		"hp": 200,
		"speed": 90,
		"cargo": 25,
		"defense": 5,
		"weapons": ["slingshot"],
		"sprite": "res://assets/vehicles/fisher.png",
		"next_stages": ["gunboat"]
	},
	"gunboat": {
		"name": "炮艇",
		"description": "装备轻型武器的快速艇",
		"hp": 350,
		"speed": 150,
		"cargo": 30,
		"defense": 10,
		"weapons": ["spear", "bow"],
		"sprite": "res://assets/vehicles/gunboat.png",
		"next_stages": ["destroyer"]
	},
	"destroyer": {
		"name": "驱逐舰",
		"description": "双炮塔+鱼雷的重型战舰",
		"hp": 600,
		"speed": 180,
		"cargo": 50,
		"defense": 20,
		"weapons": ["spear", "bow"],
		"sprite": "res://assets/vehicles/destroyer.png",
		"next_stages": ["cruiser"]
	},
	"cruiser": {
		"name": "巡洋舰",
		"description": "重型装甲+三联装主炮",
		"hp": 1000,
		"speed": 160,
		"cargo": 80,
		"defense": 35,
		"weapons": ["spear", "bow"],
		"sprite": "res://assets/vehicles/cruiser.png",
		"next_stages": ["aircraft_carrier"]
	},
	"aircraft_carrier": {
		"name": "航母",
		"description": "舰载机作战群，制海权的象征",
		"hp": 1500,
		"speed": 140,
		"cargo": 150,
		"defense": 50,
		"weapons": ["spear", "bow"],
		"sprite": "res://assets/vehicles/carrier.png",
		"next_stages": []
	}
}

# 进化消耗
const EVOLUTION_COSTS = {
	"canoe": {"wood": 30, "rope": 10, "tech_points": 0},
	"fisher": {"wood": 50, "metal_scrap": 20, "rope": 15, "tech_points": 50},
	"gunboat": {"metal_scrap": 100, "wood": 30, "rope": 20, "tech_points": 150},
	"destroyer": {"metal_scrap": 200, "electronic": 50, "tech_points": 400},
	"cruiser": {"metal_scrap": 500, "electronic": 150, "fuel": 100, "tech_points": 1000},
	"aircraft_carrier": {"metal_scrap": 1000, "electronic": 500, "fuel": 300, "tech_points": 3000}
}


func _ready():
	print("[Evolution] 进化系统就绪")


# ==================== 查询 ====================

func get_stage_info(stage: String) -> Dictionary:
	return EVOLUTION_STAGES.get(stage, {})


func get_available_evolutions(current_stage: String) -> Array:
	var stage_info = EVOLUTION_STAGES.get(current_stage, {})
	var next_stages = stage_info.get("next_stages", [])
	
	var evolutions = []
	for next_stage in next_stages:
		var info = EVOLUTION_STAGES.get(next_stage, {})
		var cost = EVOLUTION_COSTS.get(next_stage, {})
		evolutions.append({
			"stage": next_stage,
			"name": info.get("name", "?"),
			"description": info.get("description", ""),
			"cost": cost,
			"stats_preview": {
				"hp": info.get("hp", 0),
				"speed": info.get("speed", 0),
				"cargo": info.get("cargo", 0)
			}
		})
	
	return evolutions


func can_evolve(vehicle: Node, target_stage: String) -> Dictionary:
	var current_stage = vehicle.vehicle_stage
	var stage_info = EVOLUTION_STAGES.get(current_stage, {})
	var next_stages = stage_info.get("next_stages", [])
	
	# 检查是否可以进化到目标阶段
	if target_stage not in next_stages:
		return {
			"can_evolve": false,
			"reason": "当前阶段无法进化到 " + target_stage
		}
	
	# 检查消耗
	var cost = EVOLUTION_COSTS.get(target_stage, {})
	
	# 检查物资
	for resource in cost:
		if resource == "tech_points":
			if vehicle.tech_points < cost[resource]:
				return {
					"can_evolve": false,
					"reason": "科技点不足 (需要 %d, 当前 %d)" % [cost[resource], vehicle.tech_points]
				}
		elif resource != "tech_points":
			if vehicle.inventory.get(resource, 0) < cost[resource]:
				return {
					"can_evolve": false,
					"reason": "%s 不足 (需要 %d, 当前 %d)" % [resource, cost[resource], vehicle.inventory.get(resource, 0)]
				}
	
	return {
		"can_evolve": true,
		"cost": cost
	}


func get_evolution_cost(target_stage: String) -> Dictionary:
	return EVOLUTION_COSTS.get(target_stage, {})


# ==================== 进化执行 ====================

func request_evolution(vehicle: Node, target_stage: String) -> Dictionary:
	# 检查是否可以进化
	var check = can_evolve(vehicle, target_stage)
	if not check.can_evolve:
		emit_signal("evolution_cancelled", check.reason)
		return check
	
	var current_stage = vehicle.vehicle_stage
	
	# 消耗资源
	var cost = EVOLUTION_COSTS.get(target_stage, {})
	for resource in cost:
		if resource == "tech_points":
			vehicle.tech_points -= cost[resource]
		elif resource != "tech_points":
		# 扣除物资
		if vehicle.has_method("remove_item"):
			vehicle.remove_item(resource, cost[resource])
	
	# 触发进化动画和效果
	emit_signal("evolution_started", current_stage, target_stage)
	
	# 执行进化
	var new_vehicle = _execute_evolution(vehicle, target_stage)
	
	emit_signal("evolution_completed", vehicle, new_vehicle)
	
	return {
		"success": true,
		"from": current_stage,
		"to": target_stage,
		"new_vehicle": new_vehicle
	}


func _execute_evolution(vehicle: Node, target_stage: String) -> Node:
	var new_stage_info = EVOLUTION_STAGES.get(target_stage, {})
	
	# 保存位置和旋转
	var old_pos = vehicle.global_position
	var old_rot = vehicle.rotation
	
	# 获取世界引用
	var world = vehicle.get_parent()
	
	# 创建新载具
	var new_vehicle = _create_vehicle_of_stage(target_stage)
	new_vehicle.global_position = old_pos
	new_vehicle.rotation = old_rot
	
	# 复制物资
	if vehicle.has_method("get_inventory"):
		var inventory = vehicle.get("inventory")
		for item in inventory:
			new_vehicle.inventory[item] = inventory[item]
	
	# 替换
	vehicle.queue_free()
	world.add_child(new_vehicle)
	
	# 触发升级特效
	_show_evolution_effect(world, old_pos)
	
	print("[Evolution] 进化完成: ", target_stage)
	
	return new_vehicle


func _create_vehicle_of_stage(stage: String) -> Node:
	var vehicle = CharacterBody2D.new()
	vehicle.set_script(preload("res://scripts/vehicle/vehicle.gd"))
	
	var info = EVOLUTION_STAGES.get(stage, {})
	
	vehicle.vehicle_stage = stage
	vehicle.vehicle_name = info.get("name", "载具")
	vehicle.max_hp = info.get("hp", 50)
	vehicle.current_hp = vehicle.max_hp
	vehicle.speed = info.get("speed", 100)
	vehicle.cargo_capacity = info.get("cargo", 5)
	vehicle.defense = info.get("defense", 0)
	
	# 添加初始武器
	var weapons = info.get("weapons", [])
	for weapon_id in weapons:
		var weapon = _create_weapon(weapon_id)
		if weapon:
			vehicle.add_weapon(weapon)
	
	vehicle.add_to_group("vehicles")
	
	return vehicle


func _create_weapon(weapon_id: String) -> Node:
	var weapon = preload("res://scripts/combat/weapon.gd").new()
	
	var weapon_stats = {
		"rusty_paddle": {"name": "生锈船桨", "damage": 5.0, "type": 0, "range": 50.0, "fire_rate": 1.0},
		"slingshot": {"name": "弹弓", "damage": 8.0, "type": 1, "range": 200.0, "fire_rate": 0.8},
		"spear": {"name": "长矛", "damage": 12.0, "type": 0, "range": 80.0, "fire_rate": 1.5},
		"bow": {"name": "弓箭", "damage": 15.0, "type": 1, "range": 300.0, "fire_rate": 0.5}
	}
	
	var stats = weapon_stats.get(weapon_id, {})
	if stats.size() == 0:
		return null
	
	weapon.weapon_name = stats.get("name", weapon_id)
	weapon.damage = stats.get("damage", 10.0)
	weapon.weapon_type = stats.get("type", 0)
	weapon.range = stats.get("range", 100.0)
	weapon.fire_rate = stats.get("fire_rate", 1.0)
	
	return weapon


func _show_evolution_effect(world: Node, position: Vector2):
	# 简单的进化特效（闪光）
	var light = PointLight2D.new()
	light.position = position
	light.energy = 3.0
	light.texture_scale = 2.0
	light.color = Color(1.0, 0.9, 0.5)
	
	world.add_child(light)
	
	# 淡出消失
	var tween = world.create_tween()
	tween.tween_property(light, "energy", 0.0, 1.0)
	tween.chain().on_finished(func(): light.queue_free())


# ==================== 陆地/天空分支 ====================

func get_land_vehicles() -> Array:
	return [
		{"stage": "cart", "name": "手推车", "description": "陆地运输工具"},
		{"stage": "wagon", "name": "马车", "description": "马拉运输工具"},
		{"stage": "car", "name": "汽车", "description": "机动陆地载具"}
	]


func get_sky_vehicles() -> Array:
	return [
		{"stage": "glider", "name": "滑翔机", "description": "利用气流滑翔"},
		{"stage": "biplane", "name": "双翼机", "description": "螺旋桨飞机"},
		{"stage": "jet", "name": "喷气机", "description": "高速喷气动力"}
	]
