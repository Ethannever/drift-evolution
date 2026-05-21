# 游戏状态 - 核心状态管理
# 供 AI Evolution System 等模块订阅

extends Node

signal stage_advanced(new_stage: String)
signal player_died(death_count: int)
signal zone_discovered(zone_id: String)
signal resource_changed(resource_type: String, old_value: int, new_value: int)

var current_stage: String = "raft"
var death_count: int = 0
var play_time: float = 0.0
var discovered_zones: Array = []
var resources: Dictionary = {
	"wood": 0,
	"metal": 0,
	"cloth": 0,
	"food": 10,
	"water": 10,
	"fuel": 0,
	"electronic": 0,
	"tech_points": 0
}


func _process(delta: float):
	play_time += delta


func advance_stage(new_stage: String):
	if new_stage != current_stage:
		current_stage = new_stage
		stage_advanced.emit(new_stage)


func record_death():
	death_count += 1
	player_died.emit(death_count)


func discover_zone(zone_id: String):
	if not discovered_zones.has(zone_id):
		discovered_zones.append(zone_id)
		zone_discovered.emit(zone_id)


func change_resource(resource_type: String, delta: int):
	if resources.has(resource_type):
		var old_value = resources[resource_type]
		resources[resource_type] = max(0, old_value + delta)
		resource_changed.emit(resource_type, old_value, resources[resource_type])


func get_resource(resource_type: String) -> int:
	return resources.get(resource_type, 0)


func has_resources(requirements: Dictionary) -> bool:
	for resource_type in requirements:
		if resources.get(resource_type, 0) < requirements[resource_type]:
			return false
	return true


func consume_resources(requirements: Dictionary) -> bool:
	if not has_resources(requirements):
		return false
	for resource_type in requirements:
		resources[resource_type] -= requirements[resource_type]
	return true


func add_resources(gained: Dictionary):
	for resource_type in gained:
		change_resource(resource_type, gained[resource_type])


func get_save_data() -> Dictionary:
	return {
		"current_stage": current_stage,
		"death_count": death_count,
		"play_time": play_time,
		"discovered_zones": discovered_zones,
		"resources": resources
	}


func load_save_data(data: Dictionary):
	if data.has("current_stage"):
		current_stage = data.current_stage
	if data.has("death_count"):
		death_count = data.death_count
	if data.has("play_time"):
		play_time = data.play_time
	if data.has("discovered_zones"):
		discovered_zones = data.discovered_zones
	if data.has("resources"):
		resources = data.resources
